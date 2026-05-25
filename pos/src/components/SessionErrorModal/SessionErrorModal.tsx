import BaseModal from '@/components/BaseModal'
import styles from './SessionErrorModal.module.css'
import acceptButtonBg from '@/assets/svg/img_2_accept_button_background.svg'

type DeviceErrorType = 'DEVICE_IN_USE' | 'DEVICE_NOT_FOUND' | 'DEVICE_NOT_CONFIGURED'

interface ActiveSessionDetails {
  ip?: string
  browser?: string
  connectedAt?: string
  idleMinutes?: number
}

interface SessionErrorModalProps {
  deviceId: string
  errorType?: DeviceErrorType
  activeSessionDetails?: ActiveSessionDetails | null
  scale?: number
  onClose?: () => void
}

const ERROR_MESSAGES: Record<DeviceErrorType, { title?: string; lines: string[]; showDeviceId?: boolean }> = {
  DEVICE_IN_USE: {
    title: 'Dispositivo en uso',
    lines: [
      'Este dispositivo ya esta conectado desde otra ubicacion.',
      'Cada dispositivo solo puede tener una sesion activa.'
    ]
  },
  DEVICE_NOT_FOUND: {
    title: 'Dispositivo no encontrado',
    lines: [
      'Este dispositivo no esta registrado en el sistema.'
    ]
  },
  DEVICE_NOT_CONFIGURED: {
    title: 'POS No Configurado',
    lines: [
      'Este dispositivo no tiene un Device ID configurado.',
      'Edite el archivo config.json en la carpeta de datos de la aplicacion y establezca el campo "deviceId".'
    ],
    showDeviceId: false
  }
}

export default function SessionErrorModal({
  deviceId,
  errorType = 'DEVICE_IN_USE',
  activeSessionDetails,
  scale = 1,
  onClose
}: SessionErrorModalProps) {
  const message = ERROR_MESSAGES[errorType]

  return (
    <BaseModal title={message.title || 'Error'} scale={scale}>
      <p className={styles.contentText}>
        {message.lines.map((line, index) => (
          <span key={index}>
            {line}
            {index < message.lines.length - 1 && <br />}
          </span>
        ))}
      </p>
      {errorType === 'DEVICE_IN_USE' && activeSessionDetails && (
        <p className={styles.deviceId}>
          Sesion activa: {activeSessionDetails.browser || 'Desconocido'} desde {activeSessionDetails.ip || '?'}
          {activeSessionDetails.connectedAt && <><br />Conectado: {activeSessionDetails.connectedAt}</>}
          {activeSessionDetails.idleMinutes != null && activeSessionDetails.idleMinutes > 0 && <><br />Inactivo: {activeSessionDetails.idleMinutes} min</>}
        </p>
      )}
      {message.showDeviceId !== false && (
        <p className={styles.deviceId}>
          Device ID: {deviceId}
        </p>
      )}
      {onClose && (
        <div className={styles.buttonContainer}>
          <button className={styles.okButton} onClick={onClose}>
            <img src={acceptButtonBg} alt="" className={styles.buttonBg} />
            <span className={styles.buttonText}>OK</span>
          </button>
        </div>
      )}
    </BaseModal>
  )
}

export type { DeviceErrorType }
