// 서비스 작업자에게 Firebase Messaging에 대한 액세스 권한을 부여하십시오.
// 여기서 파이어베이스 메시징만 사용할 수 있습니다. 다른 파이어베이스 라이브러리 서비스 작업자는 사용할 수 없습니다.
importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-messaging.js');


firebase.initializeApp({
  'messagingSenderId': '83346353069'
});

// 처리 할 수 ​​있도록 Firebase Messaging의 인스턴스를 가져옵니다.
// messages.
const messaging = firebase.messaging();
