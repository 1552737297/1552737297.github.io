<!-- pages/myPost/myPost.vue -->
<template>
  <view class="my-post">
    <!-- 无数据占位 -->
    <view v-if="myPostList.length === 0" class="empty">
      暂无你的发布内容
    </view>

    <!-- 自己的帖子列表 -->
    <view v-for="item in myPostList" :key="item.id" class="post-item">
      <text>{{item.content}}</text>
      <!-- 删除仅自己可见操作 -->
      <view class="del-btn" @click="delPost(item.id)">删除</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore()
const myPostList = ref([])

// 拉取当前用户专属云端数据，隔离公共列表，防止冲突
const getMyPost = async () => {
  // 请求后端：接口携带userId，只查本人数据
  // 这里模拟云端请求，替换你真实接口即可
  let res = await uni.request({
    url:'你的云端个人帖子接口',
    method:'GET',
    data:{
      userId: userStore.userId
    }
  })
  myPostList.value = res.data || []
}

// 删除自己帖子
const delPost = (postId) => {
  uni.showModal({
    content:'确定删除该发布？',
    async success(res){
      if(res.confirm){
        // 调用删除接口
        await uni.request({
          url:'你的删除帖子接口',
          data:{postId,userId:userStore.userId}
        })
        uni.showToast({title:'删除成功'})
        // 重新刷新列表
        getMyPost()
      }
    }
  })
}

onShow(()=>{
  // 页面显示自动刷新个人发布
  if(userStore.isLogin){
    getMyPost()
  }
})
</script>
