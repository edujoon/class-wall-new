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
  signInAnonymously, 
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
const memosCollection = collection(db, "memos");

// --- 로그인 사용자 및 닉네임 관리 ---
let currentUser = null;
let currentNickname = "";

// 익명 닉네임 생성기 (친근한 동물 별명 + 고유 해시)
const ANIMALS = ["호랑이", "토끼", "다람쥐", "사자", "판다", "펭귄", "곰", "여우", "코알라", "사슴", "돌고래", "수달"];
const ADJECTIVES = ["행복한", "씩씩한", "지혜로운", "다정한", "용감한", "활기찬", "빛나는", "꿈꾸는", "친절한"];

function generateNickname(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const animal = ANIMALS[Math.abs(hash >> 3) % ANIMALS.length];
  const shortId = uid.slice(-3); // 고유 식별을 위한 뒤 3자리
  return `${adj} ${animal} (${shortId})`;
}

// 익명 로그인 상태 감지 및 자동 로그인
onAuthStateChanged(auth, (user) => {
  const userArea = document.getElementById("userArea");
  if (user) {
    currentUser = user;
    currentNickname = generateNickname(user.uid);
    if (userArea) {
      userArea.innerHTML = `내 작성자명: <strong>${currentNickname}</strong>`;
    }
  } else {
    // 세션이 없으면 자동으로 익명 로그인 수행
    signInAnonymously(auth).catch((error) => {
      console.error("익명 로그인 실패:", error);
      if (userArea) {
        userArea.textContent = "익명 로그인에 실패했습니다. Firebase 콘솔에서 Anonymous 로그인을 활성화했는지 확인하세요.";
      }
    });
  }
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

// 메모를 새로 씁니다. (작성자 별명 및 uid 함께 저장)
async function addMemo(text) {
  try {
    // 새 메모 기본 위치 (약간씩 엇갈리게 배치)
    const index = memos.length;
    const defaultX = 20 + ((index * 30) % 300);
    const defaultY = 20 + ((index * 30) % 200);

    await addDoc(memosCollection, {
      text: text,
      author: currentNickname || "익명 친구",
      uid: currentUser ? currentUser.uid : null,
      createdAt: Date.now(),
      x: defaultX,
      y: defaultY
    });
  } catch (error) {
    console.error("메모 저장 실패:", error);
  }
}

// 메모를 지웁니다.
async function deleteMemo(id) {
  try {
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

  // 삭제 버튼
  const del = document.createElement("button");
  del.textContent = "×";
  del.title = "메모 삭제";
  del.addEventListener("click", function (e) {
    e.stopPropagation(); // 드래그 이벤트 전파 방지
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  // 작성자 뱃지 표시
  const authorTag = document.createElement("div");
  authorTag.className = "author-tag";
  authorTag.textContent = memo.author ? `✍️ ${memo.author}` : "✍️ 익명 친구";
  div.appendChild(authorTag);

  // 텍스트 내용 표시
  const content = document.createElement("div");
  content.className = "content";
  content.textContent = memo.text;
  div.appendChild(content);

  // 드래그 & 드롭 이벤트 등록
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

    input.value = "";
    await addMemo(text);
  }
});

// 첫 화면 데이터 불러오기 및 포커스
loadMemos();
input.focus();
