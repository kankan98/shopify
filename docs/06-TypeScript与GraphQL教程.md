# 06 · TypeScript 与 GraphQL 教程

> 对应 [04 路线图](04-学习路线图.md) 的**阶段 2**。
> 目标：**够用就好**。这两块都可以学得很深，但做 Shopify 开发只需要其中一部分。
> 本文所有 Shopify 相关代码均对照官方模板真实代码。

---

# 第一部分 · TypeScript

## 1. 为什么绕不过去

App 和 Hydrogen 的官方模板**全是 `.ts` / `.tsx`**。你没有"先用 JS 写"的选项——文件后缀就决定了。

但好消息是：**你不需要成为 TS 专家。** 下面这些就够覆盖 95% 的 Shopify 开发场景。

**学习方法（重要）**：不要单独学 TS，不要看完整教程。把[阶段 1](04-学习路线图.md) 的 React 项目改成 TS，报错了再查。TS 是"用出来的"。

---

## 2. 基础类型

```ts
// 显式标注
let count: number = 0;
let name: string = 'Ada';
let ok: boolean = true;
let ids: string[] = [];
let pair: [string, number] = ['a', 1];        // 元组

// 大部分时候不用写，TS 会推断
let count = 0;              // 自动推断为 number
const status = 'draft';     // 推断为字面量类型 'draft'（const 的特殊行为）

// 特殊类型
let x: any;        // ❌ 关掉了类型检查，尽量别用
let y: unknown;    // ✅ 未知类型，用之前必须收窄，比 any 安全
function f(): void {}        // 无返回值
function g(): never {}       // 永不返回（抛错或死循环）
```

**`any` 是逃生舱，不是解决方案。** 项目里出现 `any` 说明你在放弃类型系统的价值。

---

## 3. 对象类型：interface vs type

```ts
// interface —— 描述对象结构，可以被继承和合并
interface Product {
  id: string;
  title: string;
  price?: number;              // ? = 可选
  readonly handle: string;     // 只读
  variants: Variant[];
}

interface DigitalProduct extends Product {
  downloadUrl: string;
}

// type —— 更通用，能描述联合、交叉、函数等
type Status = 'draft' | 'active' | 'archived';    // 联合类型 ⭐ 超常用
type ID = string | number;
type Handler = (id: string) => void;
type WithTimestamp = Product & { createdAt: string };   // 交叉类型
```

**怎么选**：描述对象用 `interface`，其他一律用 `type`。别纠结，两者 90% 场景可互换。

### 联合类型是 TS 最有用的特性

```ts
type Status = 'draft' | 'active' | 'archived';

let s: Status = 'draft';     // ✅
let s: Status = 'pending';   // ❌ 编译报错，还有自动补全

// 在 React 里
const [status, setStatus] = useState<Status>('draft');
```

**这一个特性就值回学 TS 的票价**——它把"字符串拼错"这类 bug 从运行时提前到了编辑器里。

---

## 4. 函数类型

```ts
// 参数和返回值
function calc(price: number, qty = 1): number {
  return price * qty;
}

// 箭头函数
const format = (n: number): string => `¥${n.toFixed(2)}`;

// 异步函数返回 Promise
async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  return res.json();
}

// 函数类型作为参数
function onEach(list: Product[], fn: (p: Product) => void): void {
  list.forEach(fn);
}
```

---

## 5. 泛型（必须懂，因为模板里到处都是）

泛型 = "类型的参数"。

```ts
// 不用泛型：只能处理 string
function first(arr: string[]): string | undefined { return arr[0]; }

// 用泛型：处理任意类型，且保持类型信息
function first<T>(arr: T[]): T | undefined { return arr[0]; }

first([1, 2, 3]);        // 返回类型自动是 number | undefined
first(['a', 'b']);       // 返回类型自动是 string | undefined
```

### Shopify 模板里的泛型

```tsx
const data = useLoaderData<typeof loader>();
//                        ↑ 把 loader 函数的类型作为泛型参数传进去
```

**这一行做了什么**：
1. `typeof loader` 拿到 loader 函数的类型
2. `useLoaderData<T>` 内部提取它的返回类型
3. 于是 `data` 自动拥有和 loader 返回值一样的类型

**价值**：你在 loader 里改了返回的字段，组件里用到旧字段的地方**立刻报错**。服务端和客户端的类型自动串起来了。

同样的：

```tsx
const fetcher = useFetcher<typeof action>();
fetcher.data?.product   // ← 有完整类型提示和补全
```

**这是 TS 在这个技术栈里最大的价值所在。**

---

## 6. 类型收窄（Narrowing）

```ts
function handle(value: string | number) {
  if (typeof value === 'string') {
    value.toUpperCase();      // ✅ 这个分支里 TS 知道它是 string
  } else {
    value.toFixed(2);         // ✅ 这个分支里是 number
  }
}

// null 检查
function f(p: Product | null) {
  if (!p) return;
  p.title;                    // ✅ 这行之后 TS 知道 p 不是 null
}

// in 操作符
if ('downloadUrl' in product) { /* 是 DigitalProduct */ }

// 可选链自动收窄
product?.variants?.[0]?.id
```

### 穷尽检查（很实用的技巧）

```ts
type Status = 'draft' | 'active' | 'archived';

function label(s: Status): string {
  switch (s) {
    case 'draft': return '草稿';
    case 'active': return '上架';
    case 'archived': return '归档';
    default:
      const _exhaustive: never = s;   // ← 如果将来 Status 加了新值，这里会报错
      return '';
  }
}
```

---

## 7. 常用工具类型

```ts
interface Product { id: string; title: string; price: number; status: Status }

Partial<Product>              // 所有字段变可选 → 适合"更新"函数的参数
Required<Product>             // 所有字段变必填
Readonly<Product>             // 所有字段只读
Pick<Product, 'id'|'title'>   // 只挑几个字段
Omit<Product, 'price'>        // 排除几个字段
Record<string, Product>       // { [key: string]: Product }

ReturnType<typeof fn>         // 拿函数返回类型
Awaited<ReturnType<typeof fn>>// 拿 async 函数 resolve 后的类型 ⭐
Parameters<typeof fn>         // 拿参数类型元组
```

实战：

```ts
// 更新函数只需要传部分字段
function update(id: string, patch: Partial<Product>) { }
update('1', { title: '新标题' });      // ✅ 不用传全部字段
```

---

## 8. 断言（谨慎使用）

```ts
// as 类型断言
const el = ref.current as HTMLInputElement;

// ! 非空断言 —— "我保证这不是 null/undefined"
const id = product.id!;

// as const —— 变成只读字面量类型
const SIZES = ['s', 'm', 'l'] as const;
type Size = typeof SIZES[number];        // 's' | 'm' | 'l'
```

### 为什么 Shopify 模板里全是 `!`

看真实模板代码：

```ts
const product = responseJson.data!.productCreate!.product!;
const variantId = product.variants.edges[0]!.node!.id!;
```

**原因**：GraphQL 生成的类型里，几乎所有字段都是可选的（`data?`、`product?`），因为 GraphQL 规范允许任何字段返回 null。所以要么写一大堆 null 检查，要么用 `!` 断言。

**风险**：`!` 是"骗过编译器"，运行时真是 null 照样炸。生产代码里应该：

```ts
const product = responseJson.data?.productCreate?.product;
if (!product) {
  throw new Error('创建商品失败');
}
// 这之后 TS 也知道 product 不是 null 了
```

模板为了简洁用了 `!`，**你的业务代码应该写检查**。

---

## 9. React + TS 常用写法

```tsx
import type { ReactNode } from 'react';

// 组件 props
interface CardProps {
  title: string;
  count?: number;
  onSelect: (id: string) => void;
  children?: ReactNode;
}

function Card({ title, count = 0, onSelect, children }: CardProps) { }

// useState
const [items, setItems] = useState<Product[]>([]);
const [selected, setSelected] = useState<Product | null>(null);
const [status, setStatus] = useState<Status>('draft');

// useRef
const inputRef = useRef<HTMLInputElement>(null);

// 事件类型
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.value;
const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => e.preventDefault();

// import type —— 只导入类型，编译后消失
import type { LoaderFunctionArgs } from 'react-router';
```

---

## 10. tsconfig 要点

模板配好了，**别乱改**。需要知道的几个：

```jsonc
{
  "compilerOptions": {
    "strict": true,              // 严格模式，必须开
    "noEmit": true,              // 只检查类型不产出文件（Vite 负责编译）
    "jsx": "react-jsx",          // 新 JSX 转换，不用 import React
    "moduleResolution": "bundler",
    "paths": { "~/*": ["./app/*"] }   // 路径别名，import from "~/shopify.server"
  }
}
```

检查命令：

```bash
npx tsc --noEmit
# App 模板里是
npm run typecheck    # → react-router typegen && tsc --noEmit
```

---

## 11. 可以完全跳过的 TS 特性

装饰器、命名空间、抽象类、`declare module` 模块扩充、条件类型 `T extends U ? A : B`、映射类型 `{ [K in keyof T]: ... }`、模板字面量类型、`infer`。

**这些是写库的人用的，做业务开发几年都碰不到。**

---

# 第二部分 · GraphQL

## 12. 为什么 Shopify 全用 GraphQL

Shopify 已经把 REST Admin API 推向退场，**新功能只在 GraphQL 里有**。你没有选择。

GraphQL 的核心思想：**客户端指定要什么字段，服务端就返回什么**。

```
REST:     GET /products/123        → 返回该商品的全部 50 个字段（大部分你不需要）
GraphQL:  query { product(id) { id title } }  → 只返回 2 个字段
```

---

## 13. 查询（Query）

### 最简形式

```graphql
query {
  products(first: 5) {
    nodes {
      id
      title
      status
    }
  }
}
```

### 带变量（生产代码必须用变量，不要拼字符串）

```graphql
query GetProducts($first: Int!, $query: String) {
  products(first: $first, query: $query) {
    nodes { id title status }
  }
}
```

变量：
```json
{ "first": 10, "query": "status:active" }
```

**类型标记**：
- `Int!` —— 感叹号表示**非空**（必填）
- `String` —— 无感叹号表示可空（选填）
- `[String!]!` —— 非空数组，元素也非空

### 嵌套查询

```graphql
query {
  product(id: "gid://shopify/Product/123") {
    id
    title
    variants(first: 10) {
      nodes {
        id
        title
        price
        inventoryQuantity
      }
    }
    metafields(first: 5) {
      nodes { namespace key value }
    }
  }
}
```

**GraphQL 的杀手锏**：一次请求拿到商品 + 变体 + 元字段。REST 需要 3 次请求。

### Fragment（复用字段选择）

```graphql
fragment ProductFields on Product {
  id
  title
  status
  featuredImage { url altText }
}

query {
  a: product(id: "gid://shopify/Product/1") { ...ProductFields }
  b: product(id: "gid://shopify/Product/2") { ...ProductFields }
}
```

注意 `a:` `b:` 是**别名**，用于在一次查询里查同一个字段多次。

---

## 14. 变更（Mutation）

```graphql
mutation CreateProduct($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product {
      id
      title
      handle
    }
    userErrors {          # ⚠️ 必写
      field
      message
    }
  }
}
```

变量：
```json
{
  "product": {
    "title": "Red Snowboard",
    "status": "ACTIVE",
    "vendor": "Acme"
  }
}
```

### ⚠️ userErrors —— 最高频的线上事故来源

**GraphQL mutation 业务失败时，HTTP 状态码依然是 200。**

```ts
const res = await admin.graphql(MUTATION, { variables });
const json = await res.json();

// ❌ 这样写，商品创建失败你完全不知道
const product = json.data.productCreate.product;   // 是 null，后面炸

// ✅ 必须检查
const { product, userErrors } = json.data.productCreate;
if (userErrors.length > 0) {
  // 业务失败：标题为空、SKU 重复、超出商品数上限……
  return { error: userErrors[0].message };
}
```

**如果你的 mutation 里没查询 `userErrors` 字段，你连错误信息都拿不到。**

### 三层错误必须都处理

```ts
async function safeGraphQL(admin, query, variables) {
  // 第 1 层：传输层（网络错误、401 token 失效、429 限流）
  const res = await admin.graphql(query, { variables });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();

  // 第 2 层：GraphQL 层（查询语法错、字段不存在、权限不足）
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  // 第 3 层：业务层（由调用方检查具体 mutation 的 userErrors）
  return json.data;
}
```

---

## 15. Relay Connection 分页（重点）

Shopify 所有列表都是这个结构。**这是新人最容易懵的地方。**

### 完整结构

```graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      node {           # ← 真正的数据在这
        id
        title
      }
      cursor           # ← 这一条的游标
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

### 为什么这么绕

**游标分页 vs 页码分页**：

| | 页码分页（offset） | 游标分页（cursor） |
|---|---|---|
| 写法 | `?page=3&limit=20` | `?after=eyJsYXN0X2lk...` |
| 能跳页 | ✅ | ❌ 只能一页页翻 |
| 数据变动时 | ❌ 会跳过/重复数据 | ✅ 稳定 |
| 大数据量性能 | ❌ `OFFSET 100000` 很慢 | ✅ 恒定 |

**Shopify 的商品/订单数据一直在变**，页码分页会导致"翻到第 2 页时，有商品因为第 1 页删了一个而被跳过"。所以必须用游标。

### JS 里的处理

```ts
const json = await res.json();
const { edges, pageInfo } = json.data.products;

const products = edges.map(e => e.node);     // ← 展开成普通数组
const nextCursor = pageInfo.endCursor;
const hasMore = pageInfo.hasNextPage;

// 翻下一页
const nextRes = await admin.graphql(QUERY, {
  variables: { first: 20, after: nextCursor }
});
```

### 简写形式 `nodes`

较新的 schema 支持直接拿数组，省掉一层：

```graphql
products(first: 10) {
  nodes { id title }
  pageInfo { hasNextPage endCursor }
}
```

**但 `edges/node` 依然大量存在**（尤其在嵌套查询和老代码里）。官方模板里就是：

```ts
const variantId = product.variants.edges[0]!.node!.id!;
```

**两种写法都要认得。**

### 向前翻页

```graphql
products(last: 20, before: $startCursor) { ... }
```

注意是 `last` + `before`，不是 `first` + `before`。

---

## 16. 全局 ID（GID）

```
gid://shopify/Product/108828309
gid://shopify/ProductVariant/30322695
gid://shopify/Order/1234567890
gid://shopify/Customer/544365967
```

**要点**：
- 传给 API 时用完整 GID 字符串
- 天然全局唯一 → **直接当 React 的 key 用**
- 从 URL 里拿到数字 ID 时要拼接：`` `gid://shopify/Product/${numericId}` ``
- 从 GID 提取数字：`gid.split('/').pop()`

---

## 17. 限流（Rate Limit）

Shopify GraphQL 用**查询成本**限流，不是请求数。

响应里会带：

```json
{
  "extensions": {
    "cost": {
      "requestedQueryCost": 52,
      "actualQueryCost": 12,
      "throttleStatus": {
        "maximumAvailable": 1000,
        "currentlyAvailable": 948,
        "restoreRate": 50
      }
    }
  }
}
```

**漏桶模型**：桶容量 1000 点，每秒恢复 50 点。查的字段越多、`first` 越大，成本越高。

**超限时返回 HTTP 429 + `THROTTLED` 错误。**

### 应对策略

```ts
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message?.includes('THROTTLED') && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;    // 指数退避 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error('重试次数用尽');
}
```

**其他建议**：
- **不要 `first: 250` 一把梭**，分批取，每批 50 左右
- 只查你真正需要的字段（成本直接和字段数挂钩）
- 大批量操作用 **Bulk Operations**（`bulkOperationRunQuery`），它是异步的、不占限流额度

---

## 18. 在 Shopify App 里实际调用

### Admin API（服务端，loader/action 里）

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
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
  return { products: json.data.products.nodes };
};
```

**三个要点**：
1. **`#graphql` 注释不能删**——它让编辑器高亮、补全，让 codegen 能扫描到
2. **只能在服务端调用**——`authenticate.admin()` 需要 secret
3. 返回的数据通过 `useLoaderData()` 到组件

### Storefront API（Hydrogen 里）

```ts
export async function loader({ context }: LoaderFunctionArgs) {
  const { products } = await context.storefront.query(PRODUCTS_QUERY, {
    variables: { first: 10 },
  });
  return { products };
}
```

---

## 19. GraphiQL —— 你最该先学会的工具

Shopify 提供了内置的交互式查询工具，能：
- 自动补全字段名
- 实时校验语法
- 浏览完整 schema 文档
- 直接执行查询看结果

```bash
shopify app dev
# 启动后终端会给出 GraphiQL 的地址
```

**强烈建议的工作流**：

```
1. 在 GraphiQL 里写查询，调到能跑通
2. 复制到代码里，包上 #graphql 注释
3. 跑 codegen 生成类型
4. 写业务逻辑
```

**这能节省至少 80% 的调试时间。** 直接在代码里瞎写 GraphQL 是最低效的做法。

---

## 20. 代码生成（codegen）

模板自带配置：

```bash
# App 线
npm run graphql-codegen

# Hydrogen 线
npm run codegen
```

**它做什么**：扫描你代码里所有 `#graphql` 字符串 → 对照 Shopify 的 schema → 生成精确的 TS 类型。

**效果**：

```ts
const json = await response.json();
json.data.products.nodes[0].titl
//                            ↑ 拼错了会立刻报错，还有自动补全
```

**这是 TS + GraphQL 组合的最大价值**。配好之后开发体验会有质的变化。

App 模板用 `@shopify/api-codegen-preset@^2.0.0`，Hydrogen 用 `@graphql-codegen/cli@5.0.2`。

---

# 阶段 2 练习清单

全程在 **GraphiQL** 里做，不写代码。做完把每个查询存进一个 `.graphql` 文件加注释。

```
基础查询
 □ 查前 10 个商品的 id / title / status
 □ 用变量 $first 参数化上面的查询
 □ 用 query 参数过滤：只看 status:active 的商品
 □ 查一个商品的详情（含 variants、images、metafields）

分页
 □ 用 edges/node/cursor 写一次查询，看清结构
 □ 用 pageInfo.endCursor + after 翻到第二页
 □ 换成 nodes 简写形式，对比差异
 □ 用 last + before 向前翻一页

Fragment
 □ 定义一个 ProductFields fragment 并复用
 □ 用别名 a:/b: 在一次查询里查两个商品

Mutation
 □ productCreate 创建一个商品，查询 userErrors
 □ 故意传空 title，观察 userErrors 的结构
 □ productUpdate 改标题
 □ productVariantsBulkUpdate 改价格
 □ productDelete 删掉它

高级
 □ 观察每次响应的 extensions.cost，理解成本计算
 □ 把 first 从 10 改到 250，对比 requestedQueryCost
 □ 查询 metafields 和 metaobjects
 □ 查询订单及其 lineItems

TypeScript（在阶段 1 的项目里做）
 □ 所有组件 props 定义 interface
 □ 所有 useState 加泛型
 □ 定义至少一个联合类型 + 穷尽检查
 □ 写一个泛型函数
 □ tsc --noEmit 零报错、零 any
```

---

# 学习资源

## TypeScript
- **[TypeScript 中文文档](https://ts.nodejs.cn/docs/handbook/intro.html)** —— 只看 Everyday Types / Narrowing / Generics 三章
- [阮一峰 TypeScript 教程](https://wangdoc.com/typescript/) —— 中文，讲得清楚
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) —— 查"这个 props 类型怎么写"

## GraphQL
- **[GraphQL 官方中文教程](https://graphql.cn/learn/)** —— 2 小时能看完，够用了
- [Shopify Admin GraphQL 参考](https://shopify.dev/docs/api/admin-graphql) —— 查具体字段
- [Shopify Storefront API 参考](https://shopify.dev/docs/api/storefront)
- **最好的练习场是 GraphiQL 本身** —— 比看任何教程都有效

---

**下一步**：去 [07 · React Router 7 数据流教程](07-ReactRouter7数据流教程.md) 学阶段 3。
