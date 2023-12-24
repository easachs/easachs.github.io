---
layout: page
---

{% assign sorted_tags = site.tags | sort %}

{% for tag in sorted_tags %}
  {% assign tag_title = tag[0] %}
  <h3 class="post-title"><a href="/tags/{{ tag_title }}">{{ tag_title }}</a></h3>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
