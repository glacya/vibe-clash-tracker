# Vibe Clash Tracker

Clash of Clans 마을 데이터를 스냅샷으로 저장하고 업그레이드 진행 상황을 추적하는 웹앱입니다.

## 개요

클래시 오브 클랜 게임의 상태를 추적하고 볼 수 있게 만든 웹 앱으로, 거의 Claude Code만 사용해 제작했습니다.
React 기반이지만 딱히 구성을 잘 아는 것은 아닙니다. 그러므로 코드의 구성이 아름답지 못할 수 있습니다.


## 법적 고지 / Legal Notice

이 프로젝트는 **비상업적 팬 프로젝트**이며 Supercell과 무관합니다.

- 이 앱은 광고 수익, 유료 서비스, 기타 상업적 목적으로 운영되지 않습니다.
- Clash of Clans의 게임 에셋(아이콘, 이미지 등)은 **Supercell**의 지적 재산권에 의해 보호됩니다.
- 이 프로젝트는 Supercell의 [Fan Content Policy](https://supercell.com/en/fan-content-policy/)를 준수합니다.

> This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it.  
> © Supercell. All game assets belong to Supercell Oy.

---

## 기술 스택

- React 19 + TypeScript + Vite
- 백엔드 없음 — 모든 데이터는 브라우저 `localStorage`에만 저장됩니다.
- 프로젝트의 80% 이상의 코드가 Claude Code로 작성되었습니다.

## 개발 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```
