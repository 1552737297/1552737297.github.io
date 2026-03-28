// 公共云端：统一数据源，所有人优先读这里
// 替换成你的真实云端接口地址
const CLOUD_URL = "你的公共帖子云端接口";

// 拉全局所有人帖子
export async function getGlobalPost(){
  let res = await fetch(`${CLOUD_URL}/list`);
  let list = await res.json();
  // 同步覆盖，不再只读本地
  localStorage.setItem("localPostCache",JSON.stringify(list));
  return list;
}

// 发布帖子→同步云端
export async function addNewPost(data){
  let user = getUser();
  if(!user) return alert("请先登录");
  let params = {
    userId:user.id,
    content:data,
    time:new Date().getTime()
  };
  await fetch(`${CLOUD_URL}/add`,{
    method:"POST",
    body:JSON.stringify(params)
  })
  // 发布后自动刷新全局
  await getGlobalPost();
}

// 只看我自己的帖子
export function getMyPost(){
  let user = getUser();
  let all = JSON.parse(localStorage.getItem("localPostCache")||"[]");
  return all.filter(item=>item.userId === user?.id);
}
