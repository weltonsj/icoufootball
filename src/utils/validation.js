function isEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function isNonEmpty(v){return typeof v==='string'&&v.trim().length>0}
function isPasswordStrong(v){return typeof v==='string'&&v.length>=6}
function validateRegister({username,email,password,confirmPassword}){
  const errors={}
  if(!isNonEmpty(username))errors.username='required'
  if(!isNonEmpty(email)||!isEmail(email))errors.email='invalid'
  if(!isNonEmpty(password)||!isPasswordStrong(password))errors.password='weak'
  if(password!==confirmPassword)errors.confirmPassword='mismatch'
  return errors
}
export{isEmail,isNonEmpty,isPasswordStrong,validateRegister}
