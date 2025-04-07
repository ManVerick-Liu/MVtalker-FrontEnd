<template>
    <!-- 页面模板 -->
    <div class="home">
      <h1>{{ title }}</h1>
      <button @click="handleClick">Click me</button>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        title: 'Welcome to My First Page'
      }
    },
    methods: {
      handleClick() {
        alert('Button clicked!')
      }
    }
  }
  </script>
  
  <style scoped>
  /* 页面私有样式 */
  .home {
    padding: 20px;
  }
  </style>