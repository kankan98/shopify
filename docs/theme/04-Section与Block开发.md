# 04 · Section 与 Block 开发

> **先说结论**:section/block 开发的本质是**给商家造可视化积木**。`.liquid` 里的 `{% schema %}` 是你和商家签的合同——你声明有哪些设置项,编辑器自动生成表单,商家填的值通过 `section.settings.xxx` / `block.settings.xxx` 流回你的模板。写好主题的标准不是"页面好看",而是**商家不碰代码就能自己搭页面**。
>
> 本章起进入贯穿实战「北纬咖啡」。

---

## 1. 一个 section 的完整解剖

`sections/image-with-text.liquid`(新建,今天的主角):

```liquid
{% # ---------- 展示部分 ---------- %}
<div class="iwt iwt--{{ section.settings.layout }}" style="padding-block: {{ section.settings.padding }}px">
  {% if section.settings.image != blank %}
    {{ section.settings.image | image_url: width: 1200 | image_tag: class: 'iwt__img' }}
  {% else %}
    {{ 'image' | placeholder_svg_tag: 'iwt__img iwt__img--placeholder' }}
  {% endif %}
  <div class="iwt__content">
    <h2>{{ section.settings.heading }}</h2>
    <div>{{ section.settings.text }}</div>
  </div>
</div>

{% # ---------- 合同部分 ---------- %}
{% schema %}
{
  "name": "图文横排",
  "tag": "section",
  "class": "section-image-with-text",
  "settings": [
    { "type": "image_picker", "id": "image", "label": "图片" },
    { "type": "text", "id": "heading", "label": "标题", "default": "埃塞俄比亚 耶加雪菲" },
    { "type": "richtext", "id": "text", "label": "正文", "default": "<p>柑橘、茉莉与红茶尾韵。</p>" },
    {
      "type": "select", "id": "layout", "label": "布局",
      "options": [
        { "value": "left", "label": "图左文右" },
        { "value": "right", "label": "图右文左" }
      ],
      "default": "left"
    },
    { "type": "range", "id": "padding", "label": "上下留白", "min": 0, "max": 96, "step": 8, "unit": "px", "default": 48 }
  ],
  "presets": [{ "name": "图文横排" }]
}
{% endschema %}
```

保存后去主题编辑器 → Add section,它已经出现了。逐项拆解:

| schema 字段 | 作用 | 坑 |
|---|---|---|
| `name` | 编辑器里显示的名字 | 必填 |
| `tag` | 包裹元素(默认 div,可 section/aside 等) | Shopify 会自动在外面包一层 `<{tag} id="shopify-section-{{ section.id }}">` |
| `class` | 加在包裹元素上的 class | 配合上一条做样式钩子 |
| `settings` | 设置项数组 | id 在本 schema 内唯一 |
| `presets` | **让 section 出现在 "Add section" 列表里** | 没写 presets 的 section 商家加不了(只能被 JSON 模板显式引用)——"我的 section 怎么找不到"的标准答案 |
| `limit` | 每页最多放几个 | 可选 |
| `enabled_on` / `disabled_on` | 限制可用于哪些模板/组 | 如公告栏只允许 header group |

**schema 是静态 JSON**:里面不能写 Liquid、不能动态生成,改完 schema 要刷新编辑器才生效。

---

## 2. Setting 类型全表(合同的词汇表)

**基础类型**(值是字符串/数字/布尔):

| type | 编辑器控件 | 取值 |
|---|---|---|
| `text` / `textarea` | 单行/多行文本 | 字符串 |
| `richtext` | 富文本 | 带 `<p>` 的 HTML 字符串 |
| `inline_richtext` | 行内富文本(无块级标签) | HTML 字符串 |
| `number` / `range` | 数字 / 滑条 | 数字 |
| `checkbox` | 开关 | true/false |
| `select` / `radio` | 下拉 / 单选 | 字符串 |
| `color` | 取色器 | color 对象(`.red`、可 `color_modify`) |
| `color_scheme` | 配色方案选择 | 见第 08 章 |
| `font_picker` | 字体选择 | font 对象 |
| `url` | 链接选择器(可选内部资源) | 字符串 |
| `image_picker` | 图库选图 | image 对象(配 `image_url` 用) |
| `video` / `video_url` | 站内视频 / YouTube·Vimeo 链接 | video 对象 / 带 id 的对象 |
| `liquid` / `html` | 商家自写代码 | 字符串(慎开) |
| `header` / `paragraph` | 纯展示的分组标题/说明文字 | 无值,只为排版设置面板 |

**资源类型**(值直接是领域对象,这是 Shopify 编辑器最强的地方):

| type | 返回 |
|---|---|
| `product` / `product_list` | product 对象 / 数组 |
| `collection` / `collection_list` | collection 对象 / 数组 |
| `page` / `blog` / `article` | 对应对象 |
| `link_list` | 导航菜单对象 |
| `metaobject` / `metaobject_list` | 第 07 章 |

例:`{ "type": "collection", "id": "featured", "label": "精选集合" }`,模板里直接 `{% for product in section.settings.featured.products limit: 4 %}`——不用自己存 id 再查。

---

## 3. 第二代块:section 内定义的 blocks

商家需要"数量不定的重复子项"(轮播的每一帧、FAQ 的每一问)时用 blocks。第二代写法(Dawn 全是这种,必须会):

```liquid
<div class="features">
  {% for block in section.blocks %}
    {% case block.type %}
      {% when 'feature' %}
        <div class="feature" {{ block.shopify_attributes }}>
          <h3>{{ block.settings.title }}</h3>
          <p>{{ block.settings.desc }}</p>
        </div>
      {% when '@app' %}
        {% render block %}
    {% endcase %}
  {% endfor %}
</div>

{% schema %}
{
  "name": "卖点列表",
  "settings": [],
  "blocks": [
    {
      "type": "feature",
      "name": "卖点",
      "settings": [
        { "type": "text", "id": "title", "label": "标题", "default": "72 小时内烘焙" },
        { "type": "text", "id": "desc", "label": "描述" }
      ]
    },
    { "type": "@app" }
  ],
  "max_blocks": 6,
  "presets": [
    {
      "name": "卖点列表",
      "blocks": [ { "type": "feature" }, { "type": "feature" }, { "type": "feature" } ]
    }
  ]
}
{% endschema %}
```

三条规则:

1. **`{{ block.shopify_attributes }}` 必须挂在每个块的根元素上**——编辑器靠它实现"点击块高亮对应区域、拖拽排序"。忘挂不报错,但编辑器里点选失灵,属于隐性 bug。
2. `{ "type": "@app" }` 表示接受 **App 块**——商家装的第三方 App(评论、倒计时等)可以把自己的 UI 插进你的 section,用 `{% render block %}` 渲染。接单时"要能装评论 App"就是指这个。
3. preset 里可以预填默认块,商家添加 section 时开箱即有 3 个卖点。

## 4. 第三代块:`blocks/` 目录的 theme blocks(你的主题正在用)

第二代块的痛点:定义在 section 里,**换个 section 就要复制粘贴一遍**。第三代把块升级为独立文件、全主题复用、支持嵌套。看你仓库里的真实文件:

**`blocks/text.liquid`**(一个块 = 一个文件,自带 schema):

```liquid
<p class="text-block" {{ block.shopify_attributes }}>{{ block.settings.text }}</p>

{% schema %}
{
  "name": "Text",
  "settings": [
    { "type": "inline_richtext", "id": "text", "label": "Text", "default": "Text block" }
  ],
  "presets": [{ "name": "Text" }]
}
{% endschema %}
```

**`blocks/group.liquid`**(容器块,靠接受嵌套块实现布局组合):

```liquid
<div class="group-block" {{ block.shopify_attributes }}>
  {% content_for 'blocks' %}   {% # 子块从这里渲染进来 %}
</div>

{% schema %}
{
  "name": "Group",
  "blocks": [{ "type": "@theme" }],
  "presets": [{ "name": "Group" }]
}
{% endschema %}
```

section 要接纳 theme blocks,schema 里声明 + 模板里渲染:

```liquid
<div class="custom-section">
  {% content_for 'blocks' %}
</div>

{% schema %}
{
  "name": "Custom section",
  "blocks": [{ "type": "@theme" }],
  "presets": [{ "name": "Custom section" }]
}
{% endschema %}
```

对照你仓库的 `sections/custom-section.liquid`,就是这个套路。语义对照表:

| 声明 | 含义 |
|---|---|
| `"blocks": [{ "type": "@theme" }]` | 接受**所有** theme blocks |
| `"blocks": [{ "type": "text" }]`(在第三代语境) | 只接受 `blocks/text.liquid` 这一种 |
| `{% content_for 'blocks' %}` | 按商家在编辑器里排的顺序渲染整棵块树 |
| `{% content_for 'block', type: 'text', id: 'fixed-intro' %}` | **静态块**:写死在模板里的某个块实例(商家可配置其设置,但不能删除/移动) |

**选型口诀**:新主题一律 theme blocks(Skeleton/Horizon 路线);维护 Dawn 系老主题用第二代 section 内 blocks;两代可以在同一主题并存,但**同一个 section 的 schema 里不能混用** `@theme` 与本地块定义。

---

## 5. Section 的样式与脚本放哪

三种方式,按需选择:

```liquid
{% stylesheet %}
.iwt { display: flex; gap: 24px; }
.iwt--right { flex-direction: row-reverse; }
{% endstylesheet %}
```

1. **`{% stylesheet %}` / `{% javascript %}`**:写在 section/block 文件里,Shopify 会把全主题所有这类代码**各自打包成一个文件**全站加载。适合少量、通用的样式。
2. **`assets/` 独立文件** + 在 section 里 `{{ 'product.css' | asset_url | stylesheet_tag }}`:只在用到该 section 的页面加载,适合大块功能(Dawn 的做法)。
3. **`{% style %}` 标签**(注意:不是 stylesheet):输出内联 `<style>`,配合 `section.id` 实现"每个实例不同样式"——settings 驱动的动态样式只能这么做:

```liquid
{% style %}
  #shopify-section-{{ section.id }} .iwt { padding-block: {{ section.settings.padding }}px; }
{% endstyle %}
```

**为什么要 `section.id`**:同一 section 商家可以在一页放多个实例,每个实例设置不同;拿 id 做命名空间才不会互相污染。

---

## 6. 编辑器预览的实时性

- 改 settings(文本/颜色):编辑器即时重渲染该 section,不刷整页;
- 你需要感知"现在在编辑器里"时用 `{% if request.design_mode %}`(比如占位提示"请选择一个集合");
- JS 侧有配套事件(section 被重渲后重新初始化脚本用),第 06 章讲:`shopify:section:load` 等。

---

## 🛠 练习(北纬咖啡 · 第一批组件)

1. 完成第 1 节的「图文横排」section,要求:布局切换生效、无图时显示占位 SVG、编辑器里能实时调留白。
2. 完成第 3 节的「卖点列表」(第二代写法,练手感),故意删掉 `block.shopify_attributes` 在编辑器里点块试试,体会它的作用,然后加回来。
3. 用**第三代写法**做一个 FAQ:`blocks/faq-item.liquid`(question 文本 + answer 富文本,`<details>/<summary>` 实现展开),`sections/faq.liquid` 通过 `@theme` + `content_for 'blocks'` 接纳它;在编辑器里加 3 个问答并拖拽排序。
4. 观察:把 FAQ 里的 faq-item 块**放进 `blocks/group.liquid` 容器里**(编辑器里操作),体验第三代的嵌套自由度——这在第二代做不到。

## ✅ 自测

- 商家说"Add section 列表里找不到你写的 section",最可能缺了什么?
- `block.shopify_attributes` 干什么用?忘写的症状是什么?
- 第二代块和第三代 theme blocks 的本质区别?什么时候必须用第二代?
- 同一个 section 在一页放两个实例,settings 驱动的样式怎么互不干扰?
- `{ "type": "@app" }` 是给谁开的口子?

## 🔁 带去 App 线

- `@app` 块的另一端就是 App 线的 **Theme App Extension**(App 往主题里塞 UI 的官方通道)——你现在是"接纳方",到 App 线你会成为"提供方",两边握手协议今天就懂了。
- "schema 声明 → 平台生成表单 → 商家填值 → 代码消费"这套合同式思维,与 App 线 extension 的 `settings` 定义完全同构。
