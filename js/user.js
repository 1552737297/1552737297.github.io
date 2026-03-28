// 本地持久化登录
export function setUser(info){
  localStorage.setItem("petUser",JSON.stringify(info));
}
export function getUser(){
  let res = localStorage.getItem("petUser");
  return res ? JSON.parse(res) : null;
}
export function logout(){
  localStorage.removeItem("petUser");
}
