# 07 · Metafields 与 Metaobjects

> **先说结论**:内置字段装不下的业务数据(咖啡豆的产区、海拔、风味),Shopify 给了两级官方扩展:**Metafield = 给已有对象(商品/集合/店铺…)追加字段;Metaobject = 从零定义一种新数据类型**。两者都是"先定义 schema,后填值"——和 section 的 schema 思想一脉相承。这是把主题从"卖货模板"升级成"内容系统"的关键,也是接单时的高频加分项。

---

## 1. Metafield:给内置对象加字段

**定义**(一次性,商家后台操作):Settings → Custom data → Products → Add definition。每个定义 = `命名空间.key` + 类型 + 校验规则,例:

| 定义 | namespace.key | 类型 |
|---|---|---|
| 产区 | `custom.origin` | 单行文本 |
| 海拔(米) | `custom.altitude` | 整数 |
| 风味标签 | `custom.flavor_notes` | **列表**·单行文本 |
| 烘焙曲线图 | `custom.roast_chart` | 文件引用 |
| 详细介绍 | `custom.story` | 富文本 |

**填值**:每个商品编辑页底部出现对应表单。

**类型系统**(常用子集,与 section settings 神似但更严格):文本(单行/多行/富文本)、数字(整数/小数)、布尔、日期、颜色、URL、JSON、评分、尺寸/重量/体积/金额,以及**引用类**——文件、商品、集合、页面、Metaobject 引用;所有类型都有"列表"变体。

## 2. 在 Liquid 里消费 Metafield

```liquid
{% assign mf = product.metafields.custom %}

{% # 标量:.value 取值,判空必须 != blank(定义存在但没填值是常态)%}
{% if mf.origin.value != blank %}
  <dt>产区</dt><dd>{{ mf.origin.value }}</dd>
{% endif %}

{% # 列表类型:.value 是数组 %}
{% for note in mf.flavor_notes.value %}
  <span class="tag">{{ note }}</span>
{% endfor %}

{% # 富文本:用 metafield_tag 渲染成 HTML(自动处理段落/加粗/链接)%}
{{ mf.story | metafield_tag }}

{% # 引用类:.value 直接是对应的 drop 对象 %}
{{ mf.roast_chart.value | image_url: width: 800 | image_tag }}
```

规则三条:

1. 永远经 `.value` 取值(metafield 本身是个带 `.type/.value` 的包装对象);
2. `| metafield_tag` 输出带语义标签的 HTML、`| metafield_text` 输出纯文本,富文本/评分/引用优先用它们;
3. **没填值 ≠ 报错**,只是 blank——所有展示都要判空,别让空 `<dt>产区</dt>` 裸奔上线。

## 3. 动态资源:让商家自己接线

第 04 章的 section settings 还有一个隐藏能力:编辑器里几乎每个 text/richtext/image 类设置的角落都有一个**"插入动态资源"图标**,商家可以把设置值绑定到 metafield(如把"图文横排"的标题绑到 `product.metafields.custom.origin`)。

对你意味着:**通用 section + metafield 定义 = 商家可自助的内容系统**。你不需要为"商品页产区横幅"写死逻辑,写好通用组件,教商家绑定即可。给商品页 section 用的设置,值会随商品自动变化——这是"一套模板服务一万个商品"的正解。

## 4. Metaobject:自定义数据类型

Metafield 是"补字段",Metaobject 是"造新表"。定义(Settings → Custom data → Metaobjects → Add definition)一个类型,如 **产区 Region**:

| 字段 | 类型 |
|---|---|
| name | 单行文本 |
| description | 富文本 |
| photo | 文件引用 |
| altitude_range | 单行文本 |

然后在 Content → Metaobjects 里添加条目(entries):埃塞俄比亚·耶加雪菲、云南·保山……每条有自己的 handle。

**消费方式一:按 handle 直取**

```liquid
{% assign region = shop.metaobjects.region['yirgacheffe'] %}
<h3>{{ region.name.value }}</h3>
{{ region.description | metafield_tag }}
```

**消费方式二(推荐):引用串联** —— 给商品加一个 `custom.region`(Metaobject 引用类型)metafield,商品页:

```liquid
{% assign region = product.metafields.custom.region.value %}
{% if region %}
  <aside class="region-card">
    {{ region.photo.value | image_url: width: 600 | image_tag }}
    <h3>{{ region.name.value }}</h3>
    {{ region.description | metafield_tag }}
  </aside>
{% endif %}
```

改一次产区资料,所有关联商品同步更新——数据归一化的好处在这就体现了。

**消费方式三:section setting** —— `{ "type": "metaobject", "metaobject_type": "region", "id": "region" }`(或 `metaobject_list`),商家在编辑器里选条目。

**大坑预警**:Liquid **不能遍历某类型的全部条目**(没有 `for r in shop.metaobjects.region` 这种写法)。要做"所有产区列表页",用 `metaobject_list` 设置让商家选,或用一个 list 类型的 metafield 存清单。设计数据结构时就要想到这一层。

## 5. Metaobject 也能是独立页面

定义时启用 **Web pages** 能力后:每个条目自动获得 URL(`/pages/metaobject-handle` 风格),模板走 `templates/metaobject/region.json`,里面的 section 通过 `metaobject` 对象访问字段——适合"产区介绍页""门店页""成分百科"这类**结构一致的批量页面**,比建几十个 Page 手写内容优雅得多。

---

## 🛠 练习(北纬咖啡 · 内容系统)

1. 建第 1 节的 5 个商品 metafield 定义,给两个测试商品填值;写 `sections/product-specs.liquid`(规格表:产区/海拔/风味标签),全部判空处理,加进商品模板。
2. 建 Region metaobject + 2 个条目;商品加 `custom.region` 引用;商品页渲染产区卡片。
3. 把第 04 章「图文横排」放进商品模板,标题**不写死**——在编辑器里用动态资源绑到 `custom.origin`,切换不同商品预览验证联动。
4. 思考题:如果要做"全部产区"索引页,你的数据结构方案是什么?(至少说出两种)

## ✅ 自测

- metafield 的 `namespace.key` 里 namespace 起什么作用?
- `{{ product.metafields.custom.story }}` 和加 `| metafield_tag` 输出有什么区别?
- 什么时候该用 Metaobject 而不是 metafield?判断标准是什么?
- 为什么"遍历全部 metaobject 条目"在主题里做不到?正确替代方案?

## 🔁 带去 App 线

- App 线里 metafield 是一等公民:`metafieldDefinitionCreate`、`metafieldsSet` 这些 GraphQL mutation 就是你刚才在后台点的那些操作的 API 形态;**很多 App 的本质就是"替商家读写 metafields 的 UI"**。
- App 自己的配置数据也惯例存在 metafield(app-owned namespace)里——今天建立的"定义/值分离"心智直接复用。
