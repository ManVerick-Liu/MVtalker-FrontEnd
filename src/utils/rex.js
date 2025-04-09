// 校验工具类

export default {
  // 校验手机号
  checkPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  },
  // 校验其他国家的手机号
  checkOtherPhone(phone) {
    return /^\d{6,15}$/.test(phone);
  },
  // 校验密码
  checkPassword(password) {
    return /^[a-zA-Z]\w{5,17}$/.test(password);
  },
  // 校验用户名
  checkUserName(userName) {
    return /^[a-zA-Z]\w{5,17}$/.test(userName);
  },
  // 校验验证码
  checkCode(code) {
    return /^\d{6}$/.test(code);
  },
  // 校验邮箱
  checkEmail(email) {
    return /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(email);
  },
  // 校验真实姓名
  checkRealName(realName) {
    return /^[\u4e00-\u9fa5]{2,4}$/.test(realName);
  },
  // 校验身份证号
  checkIdCard(idCard) {
    return /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
      idCard
    );
  },
  // 校验银行卡号
  checkBankCard(bankCard) {
    return /^[1-9]{1}[0-9]{14,18}$/.test(bankCard);
  }
}