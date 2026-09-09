# Coolkid RSS Web

基于 Vue 3、TypeScript、Quasar 和 Vite 的响应式 RSS 阅读与自动下载管理界面。桌面端和移动端共用同一套路由、业务逻辑和 API 代码。

## 环境要求

- Node.js 22 或更高版本（推荐当前 LTS）
- npm 10 或更高版本

## 安装与运行

```shell
npm install
npm run dev
```

开发服务默认运行在 `http://localhost:8080`，`/coolkid-rss` 请求会代理到配置的后端地址。

## 构建

```shell
npm run build
npm run build:staging
```

生产产物位于 `dist/spa`。项目使用 History 路由，部署服务器需要将未知路径回退到 `index.html`。

## 质量检查

```shell
npm run lint
npm run typecheck
npm run test:unit
```

## 配置

开发、staging 和生产环境变量分别位于 `.env.development`、`.env.staging` 和 `.env.production`。执行 `npm run build:staging` 时会额外加载 `.env.staging`。API 前缀默认为 `/coolkid-rss/api/`，可通过 `VITE_API_BASE_URL` 覆盖。
