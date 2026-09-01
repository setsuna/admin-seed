import JSEncrypt from 'jsencrypt'

/**
 * 密码传输加密
 *
 * 是否启用由 VITE_CRYPTO_ENABLE 控制，**必须与后端 CRYPTO_ENABLE 保持一致**：
 *   - 两端都为 true  → 前端用公钥加密，后端用 certs/private_key.pem 解密
 *   - 两端都为 false → 明文传输（依赖 HTTPS 保证链路安全）
 *   - 只开一端       → 登录必定失败，且报错是"用户名或密码错误"，很难排查
 *
 * 种子项目默认关闭，便于开箱即跑。上生产前请：
 *   1. 生成密钥对，私钥放后端 certs/private_key.pem
 *   2. 公钥填入下方 VITE_RSA_PUBLIC_KEY 或直接替换 DEFAULT_PUBLIC_KEY
 *   3. 两端开关同时置为 true
 */
const CRYPTO_ENABLED = import.meta.env.VITE_CRYPTO_ENABLE === 'true'

// 默认公钥仅用于演示，生产环境务必替换为自己的密钥对
const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmME0xwIKIWtmKoelvD17
YlvKkexnTkRf/CNlggyV8IA1AYVDXeBliuEBcqPoE3lW9zEaeBn7U87U3P7WNJx+
pbuPgg/N9JPxAIe8G8nJsouy2jINA+g/JWbSisuIcxODmpZ+FPODdE35MvrbHyx9
cFsDB88wiJPZpjLQQgfkMm5C9mJY0Qx15FoTJ/K5HxidTZTeMBo+a3UE2Pi6sGIS
TI3wWOPXc8Tq6SkQDwZW15n9KyVsziYiNXKCxxrdZoiFrhfRuNNI5bDj/6BWrnJH
FYzpZlXAZkG2WpOCJUUE1eLesZ0bESYkr7SU1PKzwr06nJU1eH0JAbW2nubq971a
PwIDAQAB
-----END PUBLIC KEY-----`

const PUBLIC_KEY = import.meta.env.VITE_RSA_PUBLIC_KEY || DEFAULT_PUBLIC_KEY

let encryptor: JSEncrypt | null = null

function getEncryptor(): JSEncrypt {
  if (!encryptor) {
    encryptor = new JSEncrypt()
    encryptor.setPublicKey(PUBLIC_KEY)
  }
  return encryptor
}

/**
 * 加密密码。未启用加密时原样返回明文。
 */
export function encryptPassword(password: string): string {
  if (!CRYPTO_ENABLED) return password

  const encrypted = getEncryptor().encrypt(password)
  if (!encrypted) {
    throw new Error('密码加密失败，请检查 VITE_RSA_PUBLIC_KEY 是否为合法公钥')
  }
  return encrypted
}

/** 当前是否启用了密码传输加密（供 UI 提示使用） */
export const isCryptoEnabled = CRYPTO_ENABLED
