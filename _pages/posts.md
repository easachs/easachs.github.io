---
layout: page
---

{%- if site.posts.size > 0 -%}
<ul class="post-list">
  {%- for post in site.posts -%}
  <li>
    {%- assign date_format = site.minima.date_format | default: "%b %-d, %Y" -%}
    <span class="post-meta">{{ post.date | date: date_format }}</span>
    <h3>
      <a href="{{ post.url | relative_url }}">
        {{ post.title | escape }}
      </a>
    </h3>
    {{ post.content | strip_html | truncatewords: 30 }}
  </li>
  {%- endfor -%}
</ul>
{%- endif -%}
