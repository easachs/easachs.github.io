---
layout: post
title:  View Components and Stimulus
date:   2024-08-28 12:00:00
tags: rails gems tutorial frontend
---

<img class="post-pic" src="/assets/images/posts/view-components.jpg" alt="Views Components">

When it comes to creating a clean, maintainable, and efficient codebase in a Rails application, the combination of View Components and Stimulus controllers can be a game-changer. In this post, I'll share how I’ve leveraged these tools to enhance the frontend of my Rails application, making it more modular and easier to work with.

### Why View Components?
In large Rails applications, views can quickly become unwieldy. The more complex the UI, the harder it is to maintain clarity and consistency across different parts of the app. Without proper organization, views can turn into a tangled web of HTML, ERB, and embedded Ruby logic that’s difficult to manage, test, and maintain.

#### The Problem with Traditional Rails Views
Traditionally, Rails views rely heavily on partials to keep things organized. While partials help, they don’t fully address the challenges of maintaining large, complex UIs. Partials can become cumbersome when you need to pass a lot of data into them, and they don’t inherently provide a clean way to encapsulate view logic. This often leads to duplicated code across multiple views, making it harder to keep your application DRY.

As your application grows, you might find yourself repeating similar HTML structures with slight variations, or worse, embedding complex Ruby logic directly into your views. This not only clutters your views but also makes it challenging to test and refactor your UI components.

#### The View Components Solution
View Components offer a powerful alternative by allowing you to encapsulate view logic into small, reusable components. Think of View Components as a way to create mini, self-contained view classes that handle their own rendering. This approach encourages a clear separation of concerns: each component is responsible for its own behavior and appearance, making your codebase more modular and maintainable.

With View Components, you can:

- **Encapsulate view logic:** Keep the logic for rendering a specific part of the UI within a single component. This makes it easier to understand and modify individual parts of your UI without affecting other areas of your application.
- **Reduce duplication:** By creating reusable components, you can avoid duplicating the same HTML and logic across multiple views. This not only keeps your code DRY but also ensures consistency across your app.
- **Simplify testing:** Since each component is a standalone class, you can write unit tests for your view components just like you would for models or controllers. This makes it easier to test complex UI logic in isolation.
- **Ease refactoring:** Refactoring becomes simpler when you can focus on small, isolated components instead of large, monolithic views. If a design or behavior change is needed, you only need to update the component, and the change will propagate wherever the component is used.

For more information, check out the View Component documentation [here](https://viewcomponent.org/).

#### An Example: The Checkbox Component
To illustrate the power of View Components, let’s look at a specific feature in Skedaddle: selecting activities and restaurants.

In Skedaddle, users can select multiple options from a list of activities (like beaches, parks, and museums) and cuisines (like Italian, Japanese, and BBQ). Initially, this logic was scattered across different views, leading to a lot of duplicated code and potential inconsistencies.

By encapsulating the checkbox selection logic into a View Component, I was able to streamline this functionality. Here’s a simplified version of the View Component that handles the checkbox logic:

{% highlight rb %}
# app/components/checkbox_component.rb
class CheckboxComponent < ViewComponent::Base
  attr_reader :data, :prefix, :size

  def initialize(data:, prefix:, size: 1)
    super
    @data   = data
    @prefix = prefix
    @size   = size
  end
end
{% endhighlight %}

And the view:

{% highlight erb %}
<%# app/components/checkbox_component.html.erb %>
<%= content_tag :div, class: 'flex flex-wrap text-sm sm:text-xs xl:text-sm text-slate-500 p-2 sm:px-10',
                      data: { controller: 'checkbox' } do %>
  <% data.each_slice(size).each do |slice| %>
    <%= content_tag :div, class: 'w-1/2 sm:w-1/4' do %>
      <% slice.each do |name, value, title=nil| %>
        <%= content_tag :p, title: title || name do %>
        <%= check_box_tag "#{prefix}[#{name}]", value, false, class: 'checkbox', data: { checkbox_target: 'checkbox' } %>
        <%= label_tag "#{prefix}[#{name}]", name %>
        <% end %>
      <% end %>
    <% end %>
  <% end %>
  <p><%= check_box_tag :select_all, true, false, class: 'checkbox', data: { checkbox_target: 'source',
                                                                            action: 'change->checkbox#toggle' } %>
  <%= label_tag :select_all %></p>
<% end %>
{% endhighlight %}

With this component, I can encapsulate all the checkbox-related logic within a single class. This makes it easy to render checkboxes consistently across different parts of the application, without duplicating the HTML structure or embedded Ruby logic.

#### The Benefits in Practice
Using View Components in this way has provided several benefits:

- **Consistency:** The checkbox UI looks and behaves the same across all views that use this component. If we need to update the design or behavior, we only have to change the component, and the change is reflected everywhere.
- **Reusability:** We can easily reuse this component in different contexts, such as when selecting categories of activities or types of restaurants, without modifying the underlying code.
- **Maintainability:** By keeping the view logic within components, our views remain clean and focused. This separation also makes it easier to refactor the UI as the application evolves.
- **Enhanced UX:** Since the View Component encapsulates not just the HTML, but also the logic for selecting and deselecting checkboxes (including a “Select All” option), we can provide a better user experience with minimal effort.

### Integrating Stimulus Controllers
While View Components help keep our views organized, Stimulus controllers are what bring them to life. Stimulus is a JavaScript framework that enhances the functionality of your HTML without adding unnecessary complexity. Packaged with Turbo as part of Hotwire's frontend tools, it’s designed to work seamlessly with Rails, making it perfect for adding interactivity to your components in a way that’s easy to manage and maintain.

#### The Role of Stimulus in Skedaddle
In modern web applications, providing a smooth and dynamic user experience is crucial. However, adding interactivity to your UI can quickly become overwhelming if not managed properly. Traditional JavaScript or jQuery can lead to tangled code that’s hard to maintain, especially when dealing with complex interactions. This is where Stimulus comes in.

Stimulus allows you to organize your JavaScript in a way that mirrors the structure of your HTML. It’s lightweight and unobtrusive, meaning it doesn’t take over your application but rather enhances it by adding behavior to your existing markup. Stimulus controllers are tied directly to your HTML elements, making it easy to manage their state and behavior.

#### A Practical Example: Managing Checkboxes with Stimulus
Let’s look at a specific example from Skedaddle. In my case, I needed a way to manage the state of multiple checkboxes – including a “Select All” option that would toggle all checkboxes within a given category. This could have been a tricky feature, especially considering the need to ensure that each category's checkboxes function independently when there are multiple lists on the same page. However, by leveraging Stimulus, I was able to implement this feature in a clean, maintainable way.

Here’s how I approached this with Stimulus:

{% highlight js %}
// app/javascript/controllers/checkbox_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["checkbox", "source"]

  toggle() {
    this.checkboxTargets.forEach((checkbox) => {
      checkbox.checked = this.sourceTarget.checked;
    });
  }
}
{% endhighlight %}

By combining this Stimulus controller with the Checkbox View Component, I was able to create a dynamic, responsive interface that handles user input smoothly. The controller only affects the checkboxes within the component it’s attached to, ensuring that multiple instances of the component can coexist on the same page without interfering with each other.

To learn more about Stimulus, check out the documentation [here](https://stimulus.hotwired.dev/handbook/introduction).

### Bringing It All Together
Using View Components and Stimulus together allowed me to create a frontend that is both modular and interactive. I’ve been able to streamline the views, reduce repetition, and ensure that my UI logic is easy to manage and maintain.

In the app:

{% highlight erb %}
<%= render CheckboxComponent.new data: activity_data,
                                 prefix: 'activities' %>
{% endhighlight %}

This approach has also made the codebase more resilient to change. If we need to update the way our checkboxes work, we can do so in a single place – the View Component – without having to hunt down and modify code scattered across different views.

### Closing
Leveraging View Components and Stimulus controllers has significantly improved the structure and functionality of my Rails application. By encapsulating complex view logic into reusable components, I’ve been able to keep the views clean, consistent, and easy to manage. This combination provides a powerful way to manage complexity in the frontend, making the development process smoother, the end product more robust, and helping us to build features that are both easy to use and easy to maintain.
