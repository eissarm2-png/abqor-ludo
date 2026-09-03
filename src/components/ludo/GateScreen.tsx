import heroBg from "@/assets/hero-bg.jpg.asset.json";

type Props = {
  onSignIn: () => void;
  onSignUp: () => void;
  onGuest: () => void;
};

/** بوابة الحساب بتصميم اللوحة المرجعية: العب / تسجيل دخول / اضغط للعب */
export function GateScreen({ onSignIn, onSignUp, onGuest }: Props) {
  return (
    <div
      className="hero-stage"
      dir="rtl"
      style={{ backgroundImage: `url(${heroBg.url})` }}
    >
      <span className="hero-offline">PLAY OFFLINE</span>

      <div className="hero-actions">
        <button type="button" className="btn3d btn3d-green" onClick={onGuest}>
          العب
        </button>
        <button type="button" className="btn3d btn3d-blue" onClick={onSignIn}>
          تسجيل دخول
        </button>
        <div className="hero-or">
          <span /> أو <span />
        </div>
        <button type="button" className="btn3d btn3d-pink" onClick={onSignUp}>
          اضغط للعب
        </button>
        <p className="hero-terms">
          بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة باللعبة
        </p>
      </div>
    </div>
  );
}
