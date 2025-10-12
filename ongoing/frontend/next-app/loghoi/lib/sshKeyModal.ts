// SSH Keyモーダルを外部から制御するためのイベント管理
export const SSH_KEY_MODAL_EVENT = 'open-ssh-key-modal'

export const openSshKeyModal = () => {
  const event = new CustomEvent(SSH_KEY_MODAL_EVENT)
  window.dispatchEvent(event)
}
