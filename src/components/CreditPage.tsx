interface Props {
  onClose: () => void;
}

export function CreditPage({ onClose }: Props) {
  return (
    <div className="credit-overlay" onClick={onClose}>
      <div className="credit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="credit-modal__header">
          <h2 className="credit-modal__title">크레딧 및 법적 고지</h2>
          <button className="credit-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="credit-modal__body">
          <section className="credit-section">
            <h3 className="credit-section__title">비상업적 팬 프로젝트</h3>
            <p className="credit-section__text">
              Vibe Clash Tracker는 클래시 오브 클랜 플레이어의 업그레이드 진행 상황을
              추적하고 한 눈에 보기 위해 만든 팬 프로젝트입니다.
              이 프로젝트는 비상업적 목적으로만 운영되어, 어떠한 수익도 창출하지 않습니다.
            </p>
          </section>

          <section className="credit-section">
            <h3 className="credit-section__title">게임 에셋 저작권</h3>
            <p className="credit-section__text">
              이 앱에서 사용된 게임 아이콘 및 이미지(건물, 영웅, 장비, 유닛 등)는
              모두 <strong>Supercell</strong>의 지적 자산입니다.
            </p>
            <p className="credit-section__text credit-section__text--en">
              © Supercell. All game assets are the property of Supercell Oy and are used
              under Supercell's Fan Content Policy for non-commercial fan purposes only.
            </p>
          </section>

          <section className="credit-section">
            <h3 className="credit-section__title">Supercell 팬 콘텐츠 정책</h3>
            <p className="credit-section__text">
              이 프로젝트는{' '}
              <a
                className="credit-link"
                href="https://supercell.com/en/fan-content-policy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Supercell Fan Content Policy
              </a>
              를 준수합니다.
            </p>
            <blockquote className="credit-blockquote">
              This content is not affiliated with, endorsed, sponsored, or specifically
              approved by Supercell and Supercell is not responsible for it.
            </blockquote>
          </section>

          <section className="credit-section">
            <h3 className="credit-section__title">데이터 처리</h3>
            <p className="credit-section__text">
              입력된 마을 데이터는 서버로 전송되지 않으며,
              브라우저의 <code>localStorage</code>에만 저장됩니다.
            </p>
          </section>

          <section className="credit-section">
            <h3 className="credit-section__title">제작</h3>
            <p className="credit-section__text">
              이 앱은 Claude Code를 이용한 바이브 코딩으로 작성되었습니다.
              약 80%의 코드가 생성형 AI를 통해 제작되었습니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
