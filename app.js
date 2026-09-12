// ===================================================
// Firebase 설정 및 초기화 (Modular SDK v12.19.0)
// ===================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqRv2BXbk_eiboX2rVrh53J4gAK3GaXYo",
  authDomain: "test-19da3.firebaseapp.com",
  projectId: "test-19da3",
  storageBucket: "test-19da3.firebasestorage.app",
  messagingSenderId: "225887089895",
  appId: "1:225887089895:web:980fbac8b59741793f5e42"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const memosCollection = collection(db, "memos");

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

// 메모를 새로 씁니다.
async function addMemo(text) {
  try {
    await addDoc(memosCollection, {
      text: text,
      createdAt: Date.now()
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

  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.addEventListener("click", function () {
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

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
