import { ref } from 'vue'

const SFTP_BOOKMARKS_KEY = 'vrshell-sftp-bookmarks'

export function useSftpBookmarks(showMessage: (message: string, type?: 'info' | 'success' | 'error') => void) {
  const sftpBookmarks = ref<string[]>([])

  function loadBookmarks() {
    try {
      sftpBookmarks.value = JSON.parse(localStorage.getItem(SFTP_BOOKMARKS_KEY) || '[]')
    } catch {
      sftpBookmarks.value = []
    }
  }

  function saveBookmarks() {
    localStorage.setItem(SFTP_BOOKMARKS_KEY, JSON.stringify(sftpBookmarks.value))
  }

  function addBookmark(path: string) {
    if (!sftpBookmarks.value.includes(path)) {
      sftpBookmarks.value.push(path)
      saveBookmarks()
      showMessage('Bookmark added', 'success')
    }
  }

  function removeBookmark(path: string) {
    sftpBookmarks.value = sftpBookmarks.value.filter((bookmark) => bookmark !== path)
    saveBookmarks()
  }

  return {
    sftpBookmarks,
    loadBookmarks,
    addBookmark,
    removeBookmark,
  }
}
