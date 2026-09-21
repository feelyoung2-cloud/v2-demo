1. Node.js 20.9 이상에서 이 폴더를 열고 `npm install`을 실행합니다.
2. Supabase SQL Editor에서 `supabase_schema.sql`을 실행하고 `.env.example`을 `.env.local`로 복사해 프로젝트 URL과 anon key를 입력합니다(Secret/service_role key 금지).
3. `npm run dev` 실행 후 http://localhost:3000 에 접속합니다. 배포용 정적 파일은 `npm run build`로 `out/`에 생성됩니다.
