// ===================================================
// Firebase 설정 및 초기화 (Modular SDK v12.19.0)
// ===================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqRv2BXbk_eiboX2rVrh53J4gAK3GaXYo",
  authDomain: "test-19da3.firebaseapp.com",
  projectId: "test-19da3",
  storageBucket: "test-19da3.firebasestorage.app",
  messagingSenderId: "225887089895",
  appId: "1:225887089895:web:980fbac8b59741793f5e42"
};

// Firebase, Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const memosCollection = collection(db, "memos");

// --- 로그인 사용자 및 닉네임 관리 ---
let currentUser = null;
let currentNickname = "";
let userRole = "student"; // "teacher" 또는 "student"

// 교사 계정 이메일 목록 (필요시 추가 가능)
const TEACHER_EMAILS = [
  "eduedujoon@gmail.com"
];

// 익명 게스트 닉네임 생성 및 로컬 저장소 유지 (브라우저별 고유 식별)
const ANIMALS = ["호랑이", "토끼", "다람쥐", "사자", "판다", "펭귄", "곰", "여우", "코알라", "사슴", "돌고래", "수달", "부엉이", "고양이", "강아지"];
const ADJECTIVES = ["행복한", "씩씩한", "지혜로운", "다정한", "용감한", "활기찬", "빛나는", "꿈꾸는", "친절한", "열정적인", "상냥한", "호기심많은"];

function getGuestNickname() {
  let guestName = localStorage.getItem("class_wall_guest_nickname");
  if (!guestName) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const randomCode = Math.random().toString(36).substring(2, 6); // 4자리 고유 코드 (예: 9a2f)
    guestName = `${adj} ${animal} (${randomCode})`;
    localStorage.setItem("class_wall_guest_nickname", guestName);
  }
  return guestName;
}

// 브라우저 고유 Guest UID (비로그인 상태일 때 부여)
function getGuestUid() {
  let guestUid = localStorage.getItem("class_wall_guest_uid");
  if (!guestUid) {
    guestUid = "guest_" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("class_wall_guest_uid", guestUid);
  }
  return guestUid;
}

// Google 로그인 상태 감지 및 UI 업데이트
onAuthStateChanged(auth, (user) => {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  if (user) {
    currentUser = user;
    currentNickname = user.displayName || user.email.split("@")[0] || "사용자";

    // 교사 이메일 목록에 있으면 teacher, 그 외는 student
    if (user.email && TEACHER_EMAILS.includes(user.email)) {
      userRole = "teacher";
    } else {
      userRole = "student";
    }

    const roleLabel = userRole === "teacher" 
      ? `<span class="role-badge teacher">교사 (모든 권한)</span>` 
      : `<span class="role-badge student">학생 (내 메모만 관리)</span>`;

    userArea.innerHTML = `
      <span>현재 작성자: <strong>${currentNickname}</strong> ${roleLabel}</span>
      <button id="logoutBtn" class="auth-btn">로그아웃</button>
    `;

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("로그아웃 실패:", error);
      }
    });
  } else {
    currentUser = null;
    currentNickname = getGuestNickname();
    userRole = "student"; // 비로그인 익명은 기본 student

    userArea.innerHTML = `
      <span>현재 작성자: <strong>${currentNickname}</strong> <span class="role-badge student">학생 (익명)</span></span>
      <button id="loginBtn" class="auth-btn">
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google 계정으로 로그인
      </button>
    `;

    document.getElementById("loginBtn").addEventListener("click", async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        console.error("Google 로그인 실패:", error);
        alert("Google 로그인에 실패했습니다: " + error.message);
      }
    });
  }
  render(); // 권한 변경에 따른 화면 갱신 (삭제 버튼 표시/숨김 등)
});

// --- 메모 목록 (로컬 캐시) ---
let memos = [];

// ===================================================
// 데이터를 다루는 함수 세 개
// AGENTS.md 규칙에 따라 함수 이름과 역할을 유지합니다.
// ===================================================

// 메모를 읽어 옵니다. (Firestore 실시간 리스너 연결)
function loadMemos() {
  const q = query(memosCollection, orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    memos = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    render();
  });
}

// 현재 활성화된 UID 반환 (로그인 시 Firebase UID, 비로그인 시 Guest UID)
function getActiveUid() {
  return currentUser ? currentUser.uid : getGuestUid();
}

// 메모를 새로 씁니다. (작성자 별명 및 uid 함께 저장)
async function addMemo(text) {
  try {
    const index = memos.length;
    const defaultX = 20 + ((index * 30) % 300);
    const defaultY = 20 + ((index * 30) % 200);
    const activeUid = getActiveUid();

    await addDoc(memosCollection, {
      text: text,
      author: currentNickname || "익명 친구",
      uid: activeUid,
      createdAt: Date.now(),
      x: defaultX,
      y: defaultY
    });
  } catch (error) {
    console.error("메모 저장 실패:", error);
  }
}

// 메모를 지웁니다. (교사이거나 본인 메모일 때만 삭제 허용)
async function deleteMemo(id) {
  try {
    const targetMemo = memos.find(m => m.id === id);
    if (!targetMemo) return;

    const activeUid = getActiveUid();
    const canManage = userRole === "teacher" || (targetMemo.uid && targetMemo.uid === activeUid);

    if (!canManage) {
      alert("다른 사람의 메모는 삭제할 수 없습니다!");
      return;
    }

    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 실패:", error);
  }
}

// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  memos.forEach(function (memo, index) {
    wall.appendChild(makeMemo(memo, index));
  });
}

// 메모 한 장 만들기 (드래그 & 드롭 및 작성자 뱃지 지원)
function makeMemo(memo, index) {
  const div = document.createElement("div");
  div.className = "memo";

  // 기본 위치 설정
  const posX = typeof memo.x === "number" ? memo.x : (20 + ((index * 30) % 300));
  const posY = typeof memo.y === "number" ? memo.y : (20 + ((index * 30) % 200));

  div.style.left = `${posX}px`;
  div.style.top = `${posY}px`;

  // 권한 판별: 교사이거나 본인이 작성한 메모인 경우만 제어 가능
  const activeUid = getActiveUid();
  const canManage = userRole === "teacher" || (memo.uid && memo.uid === activeUid);

  // 삭제 버튼 (교사이거나 본인 메모일 때만 표시)
  if (canManage) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.title = "메모 삭제";
    del.addEventListener("click", function (e) {
      e.stopPropagation(); // 드래그 이벤트 전파 방지
      deleteMemo(memo.id);
    });
    div.appendChild(del);
  }

  // 작성자 뱃지 표시
  const authorTag = document.createElement("div");
  authorTag.className = "author-tag";
  const isMine = memo.uid && memo.uid === activeUid;
  authorTag.textContent = memo.author 
    ? (isMine ? `✍️ ${memo.author} (나)` : `✍️ ${memo.author}`) 
    : "✍️ 익명 친구";
  div.appendChild(authorTag);

  // 텍스트 내용 표시
  const content = document.createElement("div");
  content.className = "content";
  content.textContent = memo.text;
  div.appendChild(content);

  // 남의 메모인 경우 커서 및 드래그 제한 (학생인 경우 다른 사람 메모 이동 금지)
  if (!canManage) {
    div.style.cursor = "default";
    div.title = "다른 사람의 메모는 이동하거나 삭제할 수 없습니다.";
    return div;
  }

  // 드래그 & 드롭 이벤트 등록 (본인 메모 또는 교사만 가능)
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initLeft = 0;
  let initTop = 0;

  div.addEventListener("mousedown", function (e) {
    // 삭제 버튼 클릭 시 드래그 제외
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initLeft = parseInt(div.style.left, 10) || 0;
    initTop = parseInt(div.style.top, 10) || 0;

    div.style.zIndex = "1000";

    function onMouseMove(moveEvent) {
      if (!isDragging) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const wall = document.getElementById("wall");
      const wallRect = wall.getBoundingClientRect();
      const memoWidth = div.offsetWidth || 200;
      const memoHeight = div.offsetHeight || 80;

      // 담벼락 영역 내로 제한
      const newLeft = Math.max(0, Math.min(initLeft + dx, wallRect.width - memoWidth));
      const newTop = Math.max(0, Math.min(initTop + dy, wallRect.height - memoHeight));

      div.style.left = `${newLeft}px`;
      div.style.top = `${newTop}px`;
    }

    async function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      div.style.zIndex = "1";

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      const finalX = parseInt(div.style.left, 10) || 0;
      const finalY = parseInt(div.style.top, 10) || 0;

      // 위치가 변경되었을 때 Firestore에 좌표 업데이트
      if (finalX !== memo.x || finalY !== memo.y) {
        try {
          await updateDoc(doc(db, "memos", memo.id), {
            x: finalX,
            y: finalY
          });
        } catch (error) {
          console.error("위치 저장 실패:", error);
        }
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  return div;
}

// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    // 5글자 이상인지 검사
    if (text.length < 5) {
      alert("메모는 5글자 이상 입력해 주세요!");
      return;
    }

    input.value = "";
    await addMemo(text);
  }
});

// 첫 화면 데이터 불러오기 및 포커스
loadMemos();
input.focus();
