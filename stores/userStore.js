// userStore.js 用户状态仓库
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: '',
    nickname: '',
    avatar: '',
    isLogin: false
  }),
  persist: {
    // 本地持久化缓存，刷新页面不丢登录
    storage: localStorage
  },
  actions: {
    // 登录赋值
    setUserInfo(data) {
      this.userId = data.userId
      this.nickname = data.nickname
      this.avatar = data.avatar
      this.isLogin = true
    },
    // 退出登录清空
    logout() {
      this.$reset()
      localStorage.removeItem('user')
    },
    // 校验登录状态
    checkLogin() {
      if(!this.isLogin) {
        uni.showToast({title:'请先登录',icon:'none'})
        // 跳转登录页
        // uni.navigateTo({url:'/pages/login/login'})
        return false
      }
      return true
    }
  }
})
