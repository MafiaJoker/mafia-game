import { ElMessage } from 'element-plus'

// Буфер обмена отказывает штатно: на небезопасном origin (http на
// LAN-адресе - ровно та связка, где рядом стоит OBS) navigator.clipboard
// вообще нет. Поэтому тост об успехе - только после удавшейся записи
export function useClipboard() {
  // true - текст в буфере, false - браузер отказал и об этом уже сказано
  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (clipboardError) {
      console.error('Буфер обмена недоступен:', clipboardError)
      ElMessage.error('Браузер не дал доступ к буферу обмена')
      return false
    }
    ElMessage.success(successMessage)
    return true
  }

  return { copyToClipboard }
}
