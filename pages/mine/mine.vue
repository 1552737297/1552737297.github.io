<!-- pages/mine/mine.vue -->
<template>
  <view class="mine-box">
    <!-- 用户信息 -->
    <view class="user-info" @click="goLogin">
      <image :src="userStore.avatar" mode="widthFix"></image>
      <text>{{userStore.isLogin ? userStore.nickname : '点击登录'}}</text>
    </view>

    <!-- 我的发布入口 -->
    <view class="menu-item" @click="goMyPost">
      <text>我的帖子/我的发布</text>
      <text>></text>
    </view>

    <!-- 退出登录 -->
    <view v-if="userStore.isLogin" class="logout-btn" @click="handleLogout">
      退出登录
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore()

// 我的发布页面跳转
const goMyPost = () => {
  if(!userStore.checkLogin()) return
  uni.navigateTo({
    url:'/pages/myPost/myPost'
  })
}

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title:'提示',
    content:'确定退出登录吗？',
    success:(res)=>{
      if(res.confirm){
        userStore.logout()
        uni.showToast({title:'已退出'})
        // 刷新页面
        setTimeout(()=>{
          uni.reLaunch({url:'/pages/index/index'})
        },800)
      }
    }
  })
}
</script>
