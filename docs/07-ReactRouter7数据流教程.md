# 07 · React Router 7 数据流教程

> 对应 [04 路线图](04-学习路线图.md) 的**阶段 3**。
> **这是投入产出比最高的一份**——App 线和 Hydrogen 线都建立在 React Router 7 之上。
> 本文所有代码结构对照 Shopify 官方模板真实文件。

---

## 0. 先破除一个误解

你可能听说过 React Router 是"一个路由库"。**在版本 7 里它已经不是了。**

Remix 团队在 2024 年把 Remix 并入了 React Router，v7 是一个**全栈框架**：服务端渲染、数据加载、表单处理、错误边界、类型生成，全都内建。

所以：
- 网上大量"Remix 教程"讲的就是它，概念和 API 基本一致（`loader`/`action`/`useLoaderData` 名字都没变）
- 你要学的不是"路由怎么配"，而是 **loader / action 数据流**

Shopify 的适配包叫 `@shopify/shopify-app-react-router`，Hydrogen 用 `react-router@7.16.0`。**两条线共用同一套心智。**

---

## 1. 核心心智：一个文件，两个世界

这是 RR7 最需要扭转的认知。

```tsx
// app/routes/products.tsx —— 一个文件

// ┌─────────────────────────────────────┐
// │  🖥️  只在服务端运行                  │
// └─────────────────────────────────────┘
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);   // 用到了 API secret
  const res = await admin.graphql(`{ products(first: 10) { nodes { id title } } }`);
  return (await res.json()).data;
};

export const action = async ({ request }) => {
  // 也只在服务端
};

// ┌─────────────────────────────────────┐
// │  🖥️ + 🌐  服务端渲染 + 浏览器 hydrate │
// └─────────────────────────────────────┘
export default function Products() {
  const data = useLoaderData<typeof loader>();
  return <div>{data.products.nodes.map(p => <p key={p.id}>{p.title}</p>)}</div>;
}
```

**关键点**：
- `loader` / `action` 的代码**不会被打包进浏览器**。你可以在里面用 API secret、连数据库、读文件。
- 默认导出的组件**两端都跑**。里面不能用 `process.env.SECRET`，不能 `import` 只能在 Node 跑的包。
- 构建工具会自动做这个切分。

**这解释了为什么 Shopify 必须用这套架构**——`authenticate.admin()` 需要 API secret 验签，绝不能出现在浏览器。

---

## 2. 请求的完整生命周期

### 首次访问（SSR）

```
浏览器请求 GET /app/products
    ↓
服务器匹配路由 app/routes/app.products.tsx
    ↓
并行执行所有匹配路由的 loader（父路由 app.tsx 的 loader 也跑）
    ↓
loader 返回数据
    ↓
服务端用数据渲染出完整 HTML 字符串
    ↓
返回 HTML（用户立刻看到内容，SEO 友好）
    ↓
浏览器下载 JS，hydrate（React 接管已有 DOM）
    ↓
页面变成可交互
```

### 客户端导航（点 `<Link>`）

```
点击 <Link to="/app/products/123">
    ↓
浏览器不刷新，React Router 拦截
    ↓
fetch 请求新路由的 loader 数据（只要 JSON，不要 HTML）
    ↓
拿到数据后渲染新组件
```

**结果**：首屏像传统服务端渲染一样快，后续导航像 SPA 一样流畅。

---

## 3. 文件路由约定（Shopify 模板用的 flatRoutes）

模板的 `app/routes.ts` 只有两行：

```ts
import { flatRoutes } from "@react-router/fs-routes";
export default flatRoutes();
```

意思是：**用文件名约定自动生成路由表**。

### 模板的真实路由文件

```
app/routes/
├── _index/                        → /
├── app.tsx                        → /app  （布局路由）
├── app._index.tsx                 → /app  （索引子路由）
├── app.additional.tsx             → /app/additional
├── auth.$.tsx                     → /auth/*  （通配）
├── auth.login/                    → /auth/login
├── webhooks.app.uninstalled.tsx   → /webhooks/app/uninstalled
└── webhooks.app.scopes_update.tsx → /webhooks/app/scopes_update
```

### 命名规则表

| 文件名 | URL | 说明 |
|---|---|---|
| `app.tsx` | `/app` | 布局路由，必须有 `<Outlet />` |
| `app._index.tsx` | `/app` | `_index` = 父路由的默认子页面 |
| `app.additional.tsx` | `/app/additional` | `.` 代表路径分隔 `/` |
| `app.products.$id.tsx` | `/app/products/:id` | `$` 开头 = 动态参数 |
| `auth.$.tsx` | `/auth/*` | 单个 `$` = 通配符（splat） |
| `app_.settings.tsx` | `/app/settings` | 末尾 `_` = **不套用 `app.tsx` 布局** |
| `_public.about.tsx` | `/about` | 开头 `_` = 路径里不出现这一段 |

**最容易搞混的**：`app.tsx` 和 `app._index.tsx` 都对应 `/app`。前者是**外壳**（导航栏、Provider），后者是**内容**，渲染进外壳的 `<Outlet />` 里。

---

## 4. 嵌套路由与 Outlet

看 Shopify 模板的真实布局路由 `app/routes/app.tsx`：

```tsx
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />              {/* ← 子路由渲染在这里 */}
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

**这个文件干了四件事**（每件都值得注意）：

1. **鉴权守卫**：loader 里 `authenticate.admin(request)`。**所有 `/app/*` 下的页面都自动受保护**——因为父路由的 loader 一定会先跑。
2. **提供 Context**：`AppProvider` 让所有子组件能用 `useAppBridge()`。
3. **导航壳**：`<s-app-nav>` 在所有子页面都存在，切换页面时不重新渲染。
4. **错误与 header 处理**：保证 iframe 里的 CSP 正确。

**访问 `/app/additional` 时的渲染结构**：

```
app.tsx 的 loader 跑  →  app.additional.tsx 的 loader 跑  （并行）
                ↓
       <AppProvider>
         <s-app-nav>...</s-app-nav>
         <Outlet>
           ← app.additional.tsx 的组件渲染在这
         </Outlet>
       </AppProvider>
```

---

## 5. loader —— 读数据

### 基本用法

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query GetProducts($first: Int!) {
        products(first: $first) {
          nodes { id title status }
          pageInfo { hasNextPage endCursor }
        }
      }`,
    { variables: { first: 20 } }
  );

  const json = await response.json();
  return { products: json.data.products };
};

export default function Products() {
  const { products } = useLoaderData<typeof loader>();
  //                                  ↑ 泛型让 products 自动有类型

  return (
    <s-page heading="商品">
      {products.nodes.map(p => (
        <s-section key={p.id} heading={p.title} />
      ))}
    </s-page>
  );
}
```

### loader 的参数

```ts
export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  // request —— 标准 Web Request 对象
  const url = new URL(request.url);
  const search = url.searchParams.get("q");        // 读 URL 查询参数
  const cookie = request.headers.get("Cookie");

  // params —— 动态路由参数
  // 文件 app.products.$id.tsx，访问 /app/products/123
  const productId = params.id;                      // "123"

  // context —— 服务端上下文（Hydrogen 里 storefront client 在这）
};
```

### loader 可以返回什么

```ts
// ① 普通对象（会被序列化成 JSON）
return { products, total: 100 };

// ② 重定向
import { redirect } from "react-router";
return redirect("/app/login");

// ③ 抛出 Response（触发 ErrorBoundary）
if (!product) {
  throw new Response("Not Found", { status: 404 });
}

// ④ 带自定义 header 的 Response
return new Response(JSON.stringify(data), {
  headers: { "Cache-Control": "max-age=60" },
});
```

### ⚠️ loader 的三条纪律

1. **只在这里调需要 secret 的 API**。这是它存在的意义。
2. **loader 是并行执行的**。父路由和子路由的 loader 同时跑，不会瀑布式等待。
3. **返回值必须能 JSON 序列化**。不能返回函数、class 实例、Date（Date 会变成字符串）。

---

## 6. action —— 写数据

看 Shopify 模板的真实 action：

```tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product { id title handle status }
        }
      }`,
    { variables: { product: { title: "Red Snowboard" } } }
  );

  const responseJson = await response.json();
  const product = responseJson.data!.productCreate!.product!;

  return { product };
};
```

### 读取表单数据

```ts
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const title = formData.get("title") as string;
  const price = Number(formData.get("price"));
  const intent = formData.get("intent");           // 区分多个操作

  if (intent === "delete") { /* ... */ }
  if (intent === "update") { /* ... */ }
};
```

### 处理 GraphQL 错误（生产代码必须写）

```ts
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const response = await admin.graphql(MUTATION, {
    variables: { product: { title: formData.get("title") } },
  });
  const json = await response.json();

  // 第 2 层：GraphQL 错误
  if (json.errors?.length) {
    return { error: json.errors[0].message };
  }

  // 第 3 层：业务错误
  const { product, userErrors } = json.data.productCreate;
  if (userErrors.length > 0) {
    return { error: userErrors[0].message, field: userErrors[0].field };
  }

  return { product };
};
```

---

## 7. 触发 action 的两种方式

### 方式一：`<Form>` —— 会导航

```tsx
import { Form, useNavigation } from "react-router";

export default function NewProduct() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post">
      <input name="title" />
      <input name="price" type="number" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "保存中..." : "保存"}
      </button>
    </Form>
  );
}
```

**特点**：
- 提交后会**导航**（URL 可能变，页面数据会重新加载）
- 提交中会有 pending 状态
- **不需要受控组件**——数据从 DOM 的 `name` 属性收集
- **禁用 JS 也能工作**（渐进增强）

### 方式二：`useFetcher()` —— 不导航

Shopify 模板首页用的就是这个：

```tsx
import { useFetcher } from "react-router";

export default function Index() {
  const fetcher = useFetcher<typeof action>();

  const isLoading = ["loading", "submitting"].includes(fetcher.state);
  const productId = fetcher.data?.product?.id;

  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="Shopify app template">
      <s-button
        onClick={generateProduct}
        {...(isLoading ? { loading: true } : {})}
      >
        Generate a product
      </s-button>

      {fetcher.data?.product && (
        <s-box padding="base" background="subdued">
          <pre style={{ margin: 0 }}>
            <code>{JSON.stringify(fetcher.data.product, null, 2)}</code>
          </pre>
        </s-box>
      )}
    </s-page>
  );
}
```

**特点**：
- **不改变 URL**，不触发导航
- 有独立的 `state` 和 `data`
- 一个页面可以有多个 fetcher，互不干扰
- 提交完成后**会自动重新验证（revalidate）当前页面的 loader**

### 什么时候用哪个

| 场景 | 用什么 |
|---|---|
| 新建/编辑表单，提交后跳详情页 | `<Form>` |
| 删除按钮 | `useFetcher` |
| 点赞/收藏这类小交互 | `useFetcher` |
| 列表里每行都有的快捷操作 | `useFetcher`（每行一个） |
| 搜索框（改 URL，可分享） | `<Form method="get">` 或 `useSearchParams` |
| 登录、注册 | `<Form>` |

---

## 8. 加载状态的正确取法

**不要用 `useState` 管 loading。**

```tsx
// ❌ 手动管，容易和实际状态不同步
const [isLoading, setIsLoading] = useState(false);

// ✅ 从框架拿
const navigation = useNavigation();
const isLoading = navigation.state !== "idle";
//                navigation.state: "idle" | "loading" | "submitting"

// ✅ fetcher 的
const fetcher = useFetcher();
const isLoading = ["loading", "submitting"].includes(fetcher.state);
```

**三种状态的含义**：
- `idle` —— 空闲
- `submitting` —— 正在提交（POST/PUT/DELETE 到 action）
- `loading` —— 正在加载（GET 到 loader，或 action 完成后重新加载）

---

## 9. URL 作为状态容器 ⭐

这是 RR7 相比传统 SPA 最重要的思想转变，也是 [02 号文档 D3](02-React知识补充清单.md) 讲的状态分层。

### 搜索与筛选

```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const cursor = url.searchParams.get("cursor");

  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(QUERY, {
    variables: {
      first: 20,
      after: cursor,
      query: [query && `title:*${query}*`, status && `status:${status}`]
        .filter(Boolean).join(" AND "),
    },
  });

  return (await res.json()).data;
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <>
      <input
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => {
          setSearchParams(prev => {
            prev.set("q", e.target.value);
            prev.delete("cursor");        // 改筛选条件时重置分页
            return prev;
          });
        }}
      />
      {/* ... */}
    </>
  );
}
```

**改 URL → 自动重新执行 loader → 数据更新。** 你完全不需要写"发请求"的代码。

### 为什么这么做

| 好处 | 说明 |
|---|---|
| 可分享 | 把筛选后的链接发给同事，他看到一样的结果 |
| 可刷新 | F5 后状态还在 |
| 可后退 | 浏览器返回键正常工作 |
| 无需状态管理库 | URL 就是状态存储 |
| 服务端可读 | loader 直接从 URL 读，不需要客户端先渲染再请求 |

### 分页（游标）

```tsx
const { products } = useLoaderData<typeof loader>();
const [searchParams, setSearchParams] = useSearchParams();

const nextPage = () => {
  setSearchParams(prev => {
    prev.set("cursor", products.pageInfo.endCursor);
    return prev;
  });
};

<s-button
  onClick={nextPage}
  {...(products.pageInfo.hasNextPage ? {} : { disabled: true })}
>
  下一页
</s-button>
```

---

## 10. 错误边界

Shopify 模板的标准写法（**照抄即可**）：

```tsx
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError } from "react-router";
import type { HeadersFunction } from "react-router";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

**为什么必须有**（模板源码里的原话）：

> Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.

嵌入式 App 在 iframe 里，**错误响应也必须带正确的 `Content-Security-Policy: frame-ancestors` header**，否则 Shopify 后台会白屏而不是显示错误信息。`boundary.headers` 就是干这个的。

### 自己写错误边界（非 Shopify 场景）

```tsx
import { useRouteError, isRouteErrorResponse } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <div>{error.status} — {error.statusText}</div>;
  }
  if (error instanceof Error) {
    return <div>出错了：{error.message}</div>;
  }
  return <div>未知错误</div>;
}
```

**错误边界的作用范围**：定义在哪个路由，就捕获那个路由及其子路由的错误。定义在布局路由上能兜住所有子页面。

---

## 11. root.tsx —— HTML 骨架

模板的真实 `app/root.tsx`：

```tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link rel="stylesheet" href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

**四个必须存在的组件**：
- `<Meta />` —— 渲染各路由导出的 meta 标签
- `<Links />` —— 渲染 link 标签（样式表等）
- `<ScrollRestoration />` —— 导航时恢复滚动位置
- `<Scripts />` —— 注入 JS bundle。**删了它就变成纯静态页面，没有交互**

注意 `<html>` 标签是你自己写的——RR7 里**整个 HTML 文档都由 React 渲染**，没有 `index.html` 模板。

---

## 12. 类型生成

```bash
npm run typecheck
# → react-router typegen && tsc --noEmit
```

`react-router typegen` 会为每个路由生成类型文件，让 `params`、`loaderData` 等有精确类型。

新版写法（可选，模板暂未全用）：

```tsx
import type { Route } from "./+types/products";

export async function loader({ params }: Route.LoaderArgs) {
  //                            ↑ params.id 有精确类型
}

export default function Products({ loaderData }: Route.ComponentProps) {
  //                                ↑ 不用 useLoaderData 也有类型
}
```

---

## 13. 阶段 3 完整练习

### 目标

做一个不依赖 Shopify 的 RR7 应用（用本地 JSON 或内存数组当数据源），包含：

```
/products              列表页（loader 拉数据 + URL 筛选 + 分页）
/products/new          新建页（Form + action）
/products/:id          详情页（动态参数）
/products/:id/edit     编辑页（嵌套路由）
```

### 分步任务

```
路由结构
 □ 建立上述 4 个路由文件，理解命名约定
 □ 加一个布局路由 products.tsx，含导航和 <Outlet />
 □ 验证：访问 /products/123 时布局和详情同时渲染

loader
 □ 列表页 loader 返回数组
 □ 详情页 loader 用 params.id 查单条
 □ 查不到时 throw new Response("Not Found", { status: 404 })
 □ 在 loader 里 console.log，确认它打印在【终端】不是浏览器

action
 □ 新建页用 <Form method="post"> + action 创建
 □ action 成功后 redirect 到详情页
 □ 加一个删除按钮，用 useFetcher 提交
 □ 用 formData.get("intent") 区分多个操作

状态
 □ 用 useNavigation() 显示提交中状态
 □ 用 fetcher.state 显示删除中状态
 □ 用 useSearchParams 做搜索框
 □ 刷新页面，验证搜索条件还在  ← 关键验证
 □ 复制 URL 到新标签页，验证结果一致  ← 关键验证

错误
 □ 写 ErrorBoundary
 □ 故意访问不存在的 id，验证错误边界生效
 □ 在 action 里返回 { error: "..." }，在组件里显示

纪律
 □ 全程零 useEffect 拉数据
 □ 全程零 useState 存服务器数据
 □ 全程零 useState 存 loading 状态
```

### 自测题

1. 为什么 `loader` 里能用 API secret，组件里不能？
2. 访问 `/products/123`，有几个 loader 会执行？它们是串行还是并行？
3. `<Form>` 和 `useFetcher().submit()` 的区别是什么？
4. 用户搜索"snowboard"后刷新页面，搜索词还在吗？为什么？
5. `app.tsx` 和 `app._index.tsx` 都对应 `/app`，它们的关系是什么？

<details>
<summary>参考答案</summary>

1. loader 的代码在构建时被排除出客户端 bundle，只在服务端运行。组件代码要发到浏览器，任何 secret 都会泄露。
2. 至少 2 个（布局路由 + 详情路由）。**并行执行**，不会瀑布式等待。
3. `<Form>` 会导航（URL 变化、进入 pending 状态、可后退）；`useFetcher` 不导航，适合页面内的局部交互，且一个页面可以有多个互不干扰。
4. 在。因为搜索词存在 URL 的 search params 里，刷新时 loader 会重新从 URL 读取。
5. `app.tsx` 是布局（外壳），必须有 `<Outlet />`；`app._index.tsx` 是访问 `/app` 时渲染进 Outlet 的默认内容。

</details>

---

## 14. 常见错误

| 错误 | 症状 | 原因 |
|---|---|---|
| 在组件里 `import` 服务端专用的包 | 构建报错 / 浏览器报错 | 只能在 loader/action 里 import，或用 `.server.ts` 文件名后缀 |
| loader 返回了 Date 对象 | 客户端拿到的是字符串 | JSON 序列化的限制，自己转 |
| 用 `useState` 存 loader 数据 | 数据不会随导航更新 | 直接用 `useLoaderData()` |
| `<Form>` 里的 input 没写 `name` | action 里 `formData.get()` 拿到 null | name 是收集数据的依据 |
| 忘记 `<Scripts />` | 页面显示正常但没有任何交互 | 没有注入 JS bundle |
| 改了 URL 参数但数据没更新 | — | 检查是不是用了 `window.history` 而不是 `setSearchParams` |
| loader 里 `console.log` 看不到 | — | 它打印在启动 dev server 的**终端**里，不是浏览器 |

---

## 15. 学习资源

- **[React Router 官方文档](https://reactrouter.com/)** —— 看 **Framework Mode** 部分，重点：
  - Routing / Route Module
  - Data Loading
  - Actions
  - Navigating
  - Pending UI
- **Remix 时期的教程依然有效** —— 概念完全相通，API 名字基本没变。看到 `@remix-run/react` 换成 `react-router` 即可。
- **最好的教材还是 Shopify 官方模板本身** —— 它只有 8 个路由文件，全部读完不超过 1 小时，每一行都有存在的理由。

```bash
npm create @shopify/app@latest
# 然后逐行读 app/ 目录
```

---

**下一步**：去 [08 · 三条线实战入门](08-三条线实战入门.md) 开始阶段 4。
