# 02 · React 知识补充清单

> 起点假设：你会写原生 JS/ES6，能操作 DOM，理解 `async/await` 和数组方法，但没系统写过 React。
> 本文只做**清单和优先级**，具体教学在 [05 · React 速成教程](05-React速成教程.md)。
> 每一项都标注了**"Shopify 哪里用到"**——如果一个概念在 Shopify 里根本用不上，我会明说，让你省下时间。

---

## 阅读方式

- **A 级（必修，12 项）**：不会就写不出任何 Shopify App。全部要掌握到"能默写"。
- **B 级（实战必用，7 项）**：做真实项目一定会撞上。掌握到"知道什么时候该用"。
- **C 级（按需，6 项）**：多数教程会花大篇幅讲，但你在 Shopify 里**短期用不到**。先跳过，标记为"知道有这回事"。
- **D 级（Shopify 特有反直觉点，4 项）**：⚠️ **这是本文档最有价值的部分**。通用 React 教程不会讲，但不懂会让你写出别扭代码。

估算总投入：**A 级约 25-35 小时，B 级约 15-20 小时，D 级约 6-8 小时。C 级 0 小时（跳过）。**

---

# A 级 · 必修（12 项）

## A1. JSX 语法

**是什么**：在 JS 里写类 HTML 的语法，编译后变成函数调用。

**需要掌握的具体点**：
- 表达式插值 `{}`，以及**它只接受表达式不接受语句**（不能写 `if`，能写三元）
- 属性名差异：`class` → `className`、`for` → `htmlFor`、事件用驼峰 `onClick`
- 属性值传 JS：`<img src={url} />`；传对象要双括号 `style={{ margin: 0 }}`
- 必须有单一根节点，或用 Fragment `<>...</>`
- 自闭合标签必须写 `/`：`<br />`
- 注释写法 `{/* ... */}`

**Shopify 哪里用到**：每一行 UI 代码。真实模板里的这段就是典型：

```jsx
<pre style={{ margin: 0 }}>
  <code>{JSON.stringify(fetcher.data.product, null, 2)}</code>
</pre>
```

**自测**：能把一段 HTML 手动转成 JSX，且说出 4 处以上差异。

**⚠️ Shopify 特殊性**：你写的标签大量是 `<s-page>` `<s-button>` 这种**带连字符的自定义元素**。JSX 对它们的处理规则和普通 React 组件不同（见 D1）。

---

## A2. 组件与 Props

**是什么**：组件是返回 JSX 的函数；props 是父组件传给它的只读参数对象。

**需要掌握**：
- 函数组件定义与导出（Shopify 路由文件用 `export default function App()`）
- props 解构：`function Card({ title, children })`
- **props 是只读的**，不能改
- `children` 的用法（组合模式）
- 默认值 `function Btn({ variant = 'primary' })`
- 组件名必须**大写开头**（小写会被当 HTML 标签）

**Shopify 哪里用到**：真实模板 `app/routes/app.tsx`：

```jsx
export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}
```

`AppProvider` 收到两个 props：`embedded`（布尔简写，等价 `embedded={true}`）和 `apiKey`。

**自测**：能写一个接收 props 和 children 的组件并组合三层。

---

## A3. 渲染心智模型（最重要的一项）

**是什么**：React 的核心思想是 **UI = f(state)**。你不再"手动改 DOM"，而是"描述某个状态下 UI 长什么样"，React 负责算差异并更新 DOM。

**必须扭转的三个 JS 老习惯**：

| 原生 JS 思维 | React 思维 |
|---|---|
| `el.textContent = count` 手动改 | 改 state，UI 自动重渲染 |
| `document.querySelector('#x')` 找元素 | 几乎不需要（除非用 ref） |
| `el.classList.add('active')` | `className={isActive ? 'active' : ''}` |
| `el.style.display = 'none'` | `{isVisible && <div/>}` 条件渲染 |

**关键认知**：
- 组件函数会被**反复调用**（每次渲染一次），所以函数体里不能有副作用
- **渲染必须是纯的**：同样的 props + state → 同样的输出，且不修改外部变量
- 副作用（改 DOM、发请求、setTimeout）只能放在**事件处理函数**或 **useEffect** 里

**Shopify 哪里用到**：无处不在。不建立这个模型，你会写出一堆 `useEffect` + `document.querySelector` 的怪代码。

**自测**：能解释"为什么组件函数里直接写 `console.log` 会打印多次"，以及"为什么不能在渲染中直接 `setState`"。

---

## A4. useState 与状态不可变更新

**是什么**：让组件"记住"数据，并在数据变化时触发重渲染。

```jsx
const [count, setCount] = useState(0);
```

**需要掌握**：
- 数组解构拿到 `[值, 设置函数]`
- **不可变更新**：不能 `arr.push(x)`，要 `setArr([...arr, x])`；不能 `obj.a = 1`，要 `setObj({...obj, a: 1})`
- **函数式更新**：`setCount(c => c + 1)`，在连续更新或闭包场景下必须用
- state 更新是**异步批处理**的，`setCount(1)` 后立刻读 `count` 还是旧值
- 初始值惰性计算：`useState(() => expensiveCalc())`

**最常见的三个新手错误**：

```jsx
// ❌ 直接改，React 检测不到变化，不重渲染
const [list, setList] = useState([]);
list.push('a'); setList(list);

// ✅
setList([...list, 'a']);

// ❌ 连续更新只生效一次（都基于同一个旧的 count）
setCount(count + 1);
setCount(count + 1);

// ✅
setCount(c => c + 1);
setCount(c => c + 1);

// ❌ 派生状态放进 state，会不同步
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);   // 多余！

// ✅ 直接推导
const total = items.reduce((s, i) => s + i.price, 0);
```

**Shopify 哪里用到**：局部 UI 状态（弹窗开关、输入框、选中项）。
**⚠️ 注意**：Shopify 全栈应用里 useState 用得比普通 React 项目**少很多**，因为服务器数据在 loader 里、表单状态在 fetcher 里。别什么都往 useState 塞（见 D3）。

**自测**：能说出"为什么必须不可变更新"（答案：React 用 `Object.is` 做浅比较判断是否变化）。

---

## A5. 事件处理

**需要掌握**：
- `onClick={handleClick}`（传函数引用，**不是** `handleClick()` 调用结果）
- 传参用箭头函数包裹：`onClick={() => remove(id)}`
- 事件对象 `e`，`e.preventDefault()`
- React 的合成事件系统（了解即可）

**Shopify 哪里用到**：真实模板：

```jsx
const generateProduct = () => fetcher.submit({}, { method: "POST" });
<s-button slot="primary-action" onClick={generateProduct}>Generate a product</s-button>
```

**⚠️ Shopify 特殊性**：`<s-button onClick={...}>` 挂在自定义元素上的事件，React 18 的处理规则和普通 DOM 元素不同——详见 D1。

---

## A6. 条件渲染

**四种写法都要会**：

```jsx
{isLoading && <Spinner />}                    // 与运算（最常用）
{error ? <Error /> : <Content />}             // 三元
{list.length === 0 && <Empty />}
{(() => { if (a) return <A/>; return <B/>; })()}  // IIFE（少用）
```

**必知的坑**：`{count && <div/>}` 当 `count` 为 `0` 时会渲染出 "0"。要写 `{count > 0 && <div/>}`。

**Shopify 哪里用到**：真实模板：

```jsx
{fetcher.data?.product && (
  <s-button onClick={...} variant="tertiary">Edit product</s-button>
)}
```

注意这里配合了**可选链 `?.`**——因为 `fetcher.data` 在提交前是 `undefined`。

---

## A7. 列表渲染与 key

```jsx
{products.map(p => <ProductCard key={p.id} product={p} />)}
```

**必须理解**：
- `key` 是给 React 做 diff 用的身份标识
- **不要用数组 index 当 key**（列表会增删/排序时出 bug）
- key 要在 `map` 直接返回的那一层元素上
- key 在兄弟节点间唯一即可，不需全局唯一

**Shopify 哪里用到**：渲染商品列表、订单列表。Shopify 的 ID 是 `gid://shopify/Product/123` 这种全局唯一字符串，天然适合当 key。

**自测**：能说清用 index 当 key 在"列表头部插入一项"时会发生什么。

---

## A8. useEffect（以及"什么时候不该用"）

**是什么**：在渲染**之后**执行副作用，并能在卸载/依赖变化时清理。

```jsx
useEffect(() => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);   // 清理函数
}, [依赖项]);
```

**需要掌握**：
- 依赖数组三种形态：不传（每次渲染都跑）、`[]`（只跑一次）、`[a, b]`（a 或 b 变时跑）
- 清理函数的时机（依赖变化前 + 卸载时）
- React 18 严格模式下开发环境**会故意执行两次**，用来暴露没写清理的 bug——不要以为是 bug

**⚠️⚠️ 最重要的一点：在 Shopify 全栈项目里，你 90% 想用 useEffect 的场景都不该用它。**

| 你想干的事 | 通用 React 教程教你 | Shopify 里正确做法 |
|---|---|---|
| 页面加载时拉数据 | `useEffect(() => fetch(...), [])` | **服务端 `loader`** |
| 提交表单 | `useEffect` 监听 | **`action` + `useFetcher`** |
| 根据 props 算派生值 | `useEffect` + `setState` | **直接在渲染里算** |
| 响应用户点击 | — | **事件处理函数** |

**那 useEffect 在 Shopify 里还有什么用？** 真实模板里唯一的用法是——**提交成功后弹一个 toast**：

```jsx
useEffect(() => {
  if (productId) {
    shopify.toast.show("Product created");
  }
}, [productId, shopify]);
```

即"服务端返回了新数据 → 触发一个非 React 管辖的外部系统（App Bridge toast）"。这才是 useEffect 的正当用途：**和外部系统同步**。

**自测**：能说出三个"不该用 useEffect"的场景。

---

## A9. 受控组件与表单基础

```jsx
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />
```

**需要掌握**：受控 vs 非受控的区别、`value` + `onChange` 配对、`checked` 用于勾选框。

**⚠️ Shopify 特殊性**：App 线的表单大量用 **React Router 的 `<Form>` / `useFetcher`**，走原生表单提交语义到 `action`，**不需要受控**。所以这一项掌握基础即可，不用深挖。详见 [07 号文档](07-ReactRouter7数据流教程.md)。

---

## A10. 状态提升与组件通信

**需要掌握**：
- 数据向下（props）、事件向上（回调函数 props）
- 两个兄弟组件要共享状态 → 把 state 提到共同父组件
- 单向数据流的含义

**Shopify 哪里用到**：任何多组件协作的界面。

---

## A11. Context（上下文）

**是什么**：跨层级传值，避免 props 一层层往下钻。

```jsx
const ThemeCtx = createContext(null);
<ThemeCtx.Provider value={theme}><App /></ThemeCtx.Provider>
// 深层组件里
const theme = useContext(ThemeCtx);
```

**Shopify 哪里用到**：**你天天在用，只是没意识到**。真实模板里的：

```jsx
<AppProvider embedded apiKey={apiKey}>
  <Outlet />
</AppProvider>
```

`AppProvider` 内部就是一堆 Context.Provider。而 `useAppBridge()` 就是一个包了 `useContext` 的自定义 Hook。

**掌握到什么程度**：会用 `useContext` 消费即可，**暂时不用学怎么自己设计 Context 架构**。

---

## A12. 组件生命周期心智（函数组件版）

不需要背 class 组件的 `componentDidMount` 那套。需要理解的是：

```
挂载(mount) → 渲染 → 提交到 DOM → 执行 effect
    ↓ state/props 变化
  重渲染 → diff → 更新 DOM → 清理旧 effect → 执行新 effect
    ↓ 移除
  卸载(unmount) → 执行所有清理函数
```

**自测**：能说出 `useEffect(() => {...}, [])` 里的代码相对于"DOM 出现在屏幕上"是先还是后执行（答：后）。

---

# B 级 · 实战必用（7 项）

## B1. useRef

**两个用途**：
1. 拿 DOM 引用：`const ref = useRef(null); <div ref={ref} />`
2. 存"不触发重渲染的可变值"：`const timerRef = useRef(null)`

**⚠️ Shopify 里的关键用途**：和 **Polaris Web Components 交互**时，某些复杂属性（对象/数组）不能通过 JSX attribute 传，必须拿 ref 后用 JS 赋 property。详见 D1。

---

## B2. 自定义 Hook

把有状态逻辑抽成可复用函数，命名必须 `use` 开头。

```jsx
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

**Shopify 哪里用到**：`useAppBridge()`、`useLoaderData()`、`useFetcher()` 全是自定义 Hook。你自己也会写（比如封装一个 `useShopifyResourcePicker`）。

**Hooks 铁律（必背）**：
1. 只能在组件函数或自定义 Hook 的**顶层**调用
2. 不能在 `if` / `for` / 嵌套函数里调用
3. 原因：React 靠调用顺序来对应状态

---

## B3. useMemo / useCallback

**是什么**：缓存计算结果 / 缓存函数引用，避免不必要的重算或重渲染。

**⚠️ 强烈建议的态度：先不要用。**

新手用它们 90% 是过早优化，反而增加代码噪音。**只在两种情况用**：
1. 有实测的性能问题（用 React DevTools Profiler 确认过）
2. 需要稳定引用作为 `useEffect` 依赖，否则会无限循环

React 18 时代这仍是建议；如果将来升到 React 19 + React Compiler，这两个 API 会更少用到。

---

## B4. 错误边界（Error Boundary）

**Shopify 哪里用到**：**官方模板强制要求你写**。真实代码：

```jsx
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError } from "react-router";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

**为什么必须有**：嵌入式 App 跑在 iframe 里，错误响应必须带上正确的 CSP header（`frame-ancestors`），否则 Shopify 后台会白屏。模板注释里明说了：

> Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.

**掌握到什么程度**：**照抄模板即可**，理解"它是为了让错误响应带对 header"就够了。不需要自己实现 class 组件版 Error Boundary。

---

## B5. 组合模式（Composition）

用 `children` 和"把组件当 props 传"来复用结构，而不是继承。

```jsx
<Card header={<Title />} footer={<Actions />}>
  <Body />
</Card>
```

**Shopify 哪里用到**：Polaris Web Components 用 **slot** 实现同样的东西：

```jsx
<s-page heading="Title">
  <s-button slot="primary-action">Save</s-button>   {/* 塞进 header 槽位 */}
  <s-section slot="aside">侧边栏</s-section>          {/* 塞进侧栏槽位 */}
  <s-section>主内容</s-section>
</s-page>
```

**这是 React composition 的 Web Components 版本**，概念相通但机制不同（slot 是浏览器原生能力）。

---

## B6. 表单与文件上传的实际处理

在 Shopify App 里主要通过 `FormData` 走 action。需要懂：
- `FormData` API
- `multipart/form-data`
- Shopify 的 staged upload 流程（图片上传要先向 Shopify 申请上传 URL）

---

## B7. React DevTools 的使用

装浏览器扩展，会看：组件树、props/state、Profiler 火焰图、找出重渲染原因。
**性价比极高，1 小时学会，省几十小时调试。**

---

# C 级 · 先跳过（6 项）

这些在通用 React 教程里占大篇幅，但**你在 Shopify 前 3 个月用不到**。知道有这回事即可。

| 项 | 为什么可以跳过 |
|---|---|
| **useReducer** | 状态复杂到需要 reducer 时，Shopify 里通常该把状态放服务端/URL |
| **Redux / Zustand / Jotai** | 全栈框架下全局状态需求极少。**别装** |
| **React Query / SWR** | loader 已经解决了数据获取和缓存 |
| **Suspense / lazy / 并发特性** | Hydrogen 会用到（`<Await>`），但由框架封装好了，到时再学 |
| **React 19 新特性**（`use`、`useActionState`、Actions、React Compiler） | 两条线的模板都还在 **React 18.3.1**。等模板升了再说 |
| **class 组件、HOC、render props** | 遗留写法，只在读老代码时需要认 |

**唯一例外**：如果你走 Hydrogen 线，`Suspense` + `<Await>` + 延迟数据加载会在中期用到，届时补 C4 即可。

---

# D 级 · ⚠️ Shopify 特有的反直觉点（4 项）

**这是本文档最有价值的部分。通用 React 教程绝不会讲，但不懂会让你在真实项目里处处别扭。**

## D1. React 与 Web Components 的互操作 ⭐⭐⭐

**背景**：Polaris React 已废弃，现在 UI 全是 `<s-page>` `<s-button>` 这类**自定义元素**。它们不是 React 组件，是浏览器原生 Custom Elements，由 App Bridge 在运行时注册。

**这带来四个具体问题**：

### 1) attribute（特性）vs property（属性）

自定义元素的 HTML attribute 只能是**字符串**。React 18 遇到自定义元素时，会把非字符串的值也**转成字符串塞进 attribute**（而不是像对待 React 组件那样直接传对象）。

```jsx
// ✅ 字符串/布尔简写，没问题
<s-button variant="tertiary" loading>Save</s-button>

// ⚠️ 传数组/对象，React 18 会变成 attribute="[object Object]"
<s-select options={[{label:'A',value:'a'}]} />   // 可能不工作

// ✅ 复杂值用 ref 直接赋 property
const ref = useRef(null);
useEffect(() => {
  if (ref.current) ref.current.options = [{label:'A', value:'a'}];
}, []);
<s-select ref={ref} />
```

**注意**：React 19 改进了自定义元素的属性处理（会优先尝试 property）。但**两条线的模板都还在 React 18**，所以现在要按 React 18 的规则来。

### 2) 布尔值的坑

```jsx
// ⚠️ React 18 会渲染成 loading="false"，而 HTML 里
//    "只要 attribute 存在就为真"，可能导致一直 loading
<s-button loading={isLoading}>Save</s-button>

// ✅ 模板里官方的写法——条件展开，false 时干脆不传这个属性
<s-button {...(isLoading ? { loading: true } : {})}>Save</s-button>
```

**这段是从官方模板 `app/routes/app._index.tsx` 里一字不差抄来的**。看到这个奇怪写法别以为是作者手抖，这是必须的。

### 3) 自定义事件

Web Components 派发的是原生 `CustomEvent`（如 `change`、`s-select`），React 的 `onXxx` 合成事件系统**不一定能捕获**非标准事件名。标准事件名（click/change/input）通常可以，自定义事件名需要用 ref + `addEventListener`：

```jsx
const ref = useRef(null);
useEffect(() => {
  const el = ref.current;
  const handler = (e) => console.log(e.detail);
  el?.addEventListener('s-change', handler);
  return () => el?.removeEventListener('s-change', handler);
}, []);
```

### 4) TypeScript 类型

`@shopify/polaris-types` 这个包就是干这个的——它给 JSX 声明 `<s-page>` 等元素的类型，否则 TS 会报"不认识这个标签"。所以别看它是 devDependency 就删掉。

**需要补的知识**：Custom Elements API 基础、slot 机制、attribute/property 区别、`CustomEvent`。详见 [03 号文档第 6 节](03-其他前端知识清单.md)。

---

## D2. 数据获取不在 React 里 ⭐⭐⭐

**通用 React 教程的世界观**：组件挂载 → useEffect → fetch → setState → 渲染。

**Shopify 全栈的世界观**：

```
浏览器请求 /app
    ↓
服务端跑 loader()  ← 在这里 authenticate + 调 Admin GraphQL
    ↓
服务端渲染 HTML（数据已经在里面）
    ↓
浏览器 hydrate
    ↓
组件里 useLoaderData() 直接拿到数据
```

真实模板代码：

```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);      // 服务端鉴权
  return null;                             // 返回给组件的数据
};

export default function Index() {
  const data = useLoaderData<typeof loader>();   // 组件里直接拿
  // 没有 useEffect，没有 loading 状态，没有 fetch
}
```

**为什么必须这样**：`authenticate.admin()` 需要 API secret，**绝不能出现在浏览器里**。所以调 Admin API 天然只能在服务端。

**心智转换**：你要习惯"一个路由文件里，`loader`/`action` 跑在服务端，`export default` 的组件跑在两端"。**同一个文件，两个世界。**

---

## D3. 状态的四个层次，别都塞进 useState ⭐⭐

在 Shopify 全栈项目里，状态有明确的分层，选错层次是最常见的架构错误：

| 状态类型 | 存哪 | 例子 |
|---|---|---|
| **服务器数据** | `loader` 返回值 | 商品列表、订单详情 |
| **URL 状态** | search params（`useSearchParams`） | 分页游标、筛选条件、排序、搜索词 |
| **提交中状态** | `useNavigation()` / `fetcher.state` | 按钮 loading、禁用表单 |
| **纯 UI 状态** | `useState` | 弹窗开关、折叠面板、tooltip |

**判断法则**：问自己"用户刷新页面 / 分享这个链接给同事，这个状态应该保留吗？"
- 应该保留 → 放 **URL**
- 不应该 → 放 `useState`

**反面例子**：把分页页码放 useState → 用户翻到第 5 页、刷新，回到第 1 页；分享链接给同事，同事看到第 1 页。**这是 bug，不是设计。**

真实模板里 loading 状态的正确取法：

```jsx
const fetcher = useFetcher<typeof action>();
const isLoading = ["loading", "submitting"].includes(fetcher.state);
// 而不是 const [isLoading, setIsLoading] = useState(false)
```

---

## D4. 你的 React 组件运行在 iframe 里 ⭐⭐

嵌入式 App 跑在 Shopify 后台的 iframe 中，这带来一串你在普通 React 项目里遇不到的约束：

| 约束 | 后果 | 应对 |
|---|---|---|
| 第三方 cookie 被浏览器拦截 | 传统 session cookie 不可用 | 用 **session token**（JWT），由 App Bridge 自动附加 |
| CSP `frame-ancestors` | header 错了就白屏 | 用模板的 `boundary.headers` |
| 不能自己弹浏览器原生 modal/alert | 体验割裂 | 用 App Bridge 的 `shopify.toast` / `<s-modal>` |
| 导航要和外层同步 | 浏览器地址栏、返回键会错乱 | 用 App Bridge / RR 的 Link，别用 `window.location` |
| 不能直接读外层页面 | 跨域隔离 | 通过 App Bridge 通信 |

真实模板里调用 App Bridge 的例子：

```jsx
const shopify = useAppBridge();
shopify.toast.show("Product created");
shopify.intents.invoke?.("edit:shopify/Product", { value: product.id });
```

**认知**：`useAppBridge()` 返回的对象是你和"宿主 Shopify 后台"通信的唯一桥梁。

---

# 总结：优先级速查表

```
必须先学，无法绕过（约 30h）
  A3 渲染心智模型  ← 最重要，先建立它
  A1 JSX
  A2 组件与 Props
  A4 useState + 不可变更新
  A5 事件处理
  A6 条件渲染
  A7 列表与 key
  A8 useEffect（重点是学"何时不用"）
  A9 受控组件（基础即可）
  A10 状态提升
  A11 Context（会消费即可）
  A12 生命周期心智

做项目时补（约 18h）
  B1 useRef      B2 自定义 Hook   B3 useMemo/useCallback（先别用）
  B4 错误边界（抄模板）  B5 组合/slot   B6 FormData   B7 DevTools

读 Shopify 代码前必看（约 7h）★★★
  D1 React × Web Components 互操作
  D2 数据获取在 loader 不在 React
  D3 状态四层次
  D4 iframe 约束

先跳过（0h）
  C1 useReducer  C2 Redux/Zustand  C3 React Query
  C4 Suspense（Hydrogen 线中期再补）  C5 React 19 新特性  C6 class 组件
```

**下一步**：去 [05 · React 速成教程](05-React速成教程.md) 动手写 A 级的每一项。
