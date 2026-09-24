# 물 받아라!

손그림 캐릭터와 함께하는 **한 기기 로컬 2인 웹게임**. 깨끗한 물은 따라가서 받고, 똥물은 예고를 보고 피하세요. 기존 기획 문서와 `assets/`의 PNG·SVG로 만든 플레이 가능한 MVP입니다.

## 실행

Node.js 22 이상에서 외부 패키지 설치 없이 실행합니다.

```sh
npm start
```

브라우저에서 **http://localhost:3000**을 엽니다. 다른 포트는 `PORT=3001 npm start`로 지정합니다. 개발 서버는 로컬 컴퓨터에만 열립니다. 게임은 정적 HTML/CSS/JavaScript이므로 일반 정적 호스팅의 하위 경로에서도 실행할 수 있습니다. ES 모듈을 사용하므로 `index.html` 파일을 직접 더블클릭하는 대신 HTTP 서버로 여세요.

## 플레이

1. 두 친구의 이름과 컵 색을 고르고 **대결 시작!**
2. 물 받기: **A / S / D**, 방해하기: **← / ↓ / →**, 똥물: **Space**. 화면의 좌·중앙·우 버튼으로도 조작합니다.
3. 45초 뒤 역할을 바꾸고 두 사람 모두 **준비 완료**를 누릅니다.
4. 두 번째 라운드 종료 후 누적 물의 양을 비교합니다. 동점은 공동 우승. **한 판 더**에서는 시작 역할도 바뀝니다.

**Escape** 또는 상단 버튼으로 일시정지합니다. 창 포커스를 잃거나 다른 탭으로 이동해도 자동 정지하며, 명시적으로 재개해야 이어집니다. 태블릿 가로 화면과 데스크톱을 권장합니다. 이름과 컵 선택은 가능한 경우 해당 브라우저에만 저장합니다.

## 구현과 검증

- `src/config.js`: 시간, 물 양, 이동 속도, 똥물 횟수 등 모든 밸런스 수치
- `src/simulation.js`: 시간순 이벤트 판정, 물 묶음, 이동, 똥물
- `src/state.js`: 역할 교대, 기록, 승패
- `src/input.js`: 키 반복 방지, 독립 pointer 입력, 포커스·숨김 대응
- `src/render.js`: 기존 에셋을 이용한 Canvas 경기장과 컵 수위
- `src/main.js`: 준비·카운트다운·경기·교대·결과 화면과 일시정지

```sh
npm test
```

판정 회귀 테스트는 첫 도착 750ms, 종료 직전 최대 4,430mL, 동시각 컵 이동, 발사 레인 보존, 똥물 6묶음당 감점 1회, 점수 하한, 쿨다운·횟수 제한, 60/120Hz 일치, 승패·재경기 초기화를 확인합니다. 브라우저 검수 및 남은 실기기 검증은 [검증 기록](docs/testing.md)을 참고하세요.

## 기획 및 에셋

- [게임 기획서](docs/design/game-design.md)
- [개발 인수인계](docs/design/development-handoff.md)
- [에셋 가이드](docs/design/asset-guide.md)
- [에셋 미리보기](assets/preview.html)
- 원본 메모: `IMG_5069.jpg`

현재 구현은 기획서의 초기 밸런스를 사용합니다. 온라인 모드·AI 상대·사운드는 후속 범위입니다.

## 배포 (GitHub Pages)

주소: https://umid-podo.github.io/hahaha-fill-with-water-001/

`main`에 push하면 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)이 게임 실행에 필요한 파일만 모아 배포한다. 문서와 테스트는 사이트에 올라가지 않는다. 게임이 새 파일이나 폴더를 쓰게 되면 워크플로의 `Collect game files` 단계에도 추가한다. 빠뜨리면 사이트에서 404가 난다.

### Claude Code Cloud에서 배포

"배포해줘"라는 요청을 받으면 아래 순서대로 진행한다. 클라우드 세션은 자기 작업 브랜치에만 push할 수 있으므로 PR로 `main`에 반영한다.

1. 테스트: `npm test`.
2. 변경 사항을 커밋하고 작업 브랜치를 push한다.
   ```sh
   git push -u origin HEAD
   ```
3. PR을 만들고 병합한다. 병합되면 `main` push로 배포가 자동으로 시작된다. 이미 열린 PR이 있으면 새로 만들지 않고 그 PR을 병합한다.
   ```sh
   gh pr create --repo umid-podo/hahaha-fill-with-water-001 --base main --fill
   gh pr merge --repo umid-podo/hahaha-fill-with-water-001 --merge
   ```
4. 병합이 막히면 작업 브랜치를 바로 배포한다. `github-pages` 환경은 `main`과 `claude/*` 브랜치의 배포만 허용한다.
   ```sh
   gh workflow run deploy-pages.yml --repo umid-podo/hahaha-fill-with-water-001 --ref "$(git branch --show-current)"
   ```
   이 경우 `main`에는 아직 반영되지 않았으므로 사용자에게 PR 병합을 요청한다. 병합하지 않으면 다음 `main` 배포가 이 변경을 덮어쓴다.
5. 배포 실행이 끝날 때까지 기다린다. 실행 목록에 바로 보이지 않으면 몇 초 뒤 다시 조회한다.
   ```sh
   gh run list --repo umid-podo/hahaha-fill-with-water-001 --workflow deploy-pages.yml --limit 1
   gh run watch <실행 ID> --repo umid-podo/hahaha-fill-with-water-001 --exit-status
   ```
6. 사이트가 `200`을 돌려주는지 확인하고 주소를 사용자에게 알린다. 클라우드 네트워크에서 `github.io`에 접속할 수 없으면 5번의 성공 결과로 대신하고, 그렇게 보고한다.
   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://umid-podo.github.io/hahaha-fill-with-water-001/
   ```

### 로컬에서 배포

`main`에서 커밋하고 `git push`하면 된다. 확인은 위 5~6번과 같다.

### 처음 설정 (완료됨)

저장소 Settings → Pages의 Source는 **GitHub Actions**이고, Settings → Environments → `github-pages`의 배포 브랜치는 `main`, `claude/*`로 제한되어 있다. Pages 설정이 꺼졌다면 아래 명령으로 다시 켠다.

```sh
gh api -X POST repos/umid-podo/hahaha-fill-with-water-001/pages -f build_type=workflow
```
