---
layout: post
title:  Split Testing with Rails
date:   2023-12-15 12:00:00
tags: rails gems tutorial backend
---

<img class="post-pic" src="/assets/images/posts/field-test.jpg" alt="Split Testing">

Split testing, also known as A/B testing, is a practice used in web development to improve user experience and increase a site's effectiveness by comparing metrics for different versions of a given feature. In other words, which option performs better? This can be measured by user engagement, such as time spent on a page, or conversion rates - counting relative clicks, form submissions, purchases, or any other performance indicator.

Split testing is an excellent research tool because it puts the user experience at the forefront, focusing on what actual users prefer and how they behave. Will a page's new layout or theme impact the way your audience interacts with the site? Even changing the color of a button could result in users clicking it more or less often. With an effective split testing framework, businesses can better understand the impact of any changes they make.

While many businesses use paid services like **Optimizely**, we recently implemented split testing in Rails with [field_test](https://github.com/ankane/field_test), which is available for free and comes with a dashboard for viewing results, using Bayesian statistics to evaluate how the different variants perform. While the docs are fantastic, I wanted to record the process of setting up **field_test** as well as highlight some key takeaways and challenges we encountered.

For our test we wanted half of new users to receive one variant of a popup, and the rest another - while tracking how many from each group signed up for a newsletter (our metric). Over time, we can use these results to make informed, data-driven decisions about which version of a feature performs better to improve and optimize an application.

### Installation
Add `gem 'field_test'` to your Gemfile, then install it:

{% highlight sh %}
bundle install
{% endhighlight %}

### Migration
Create and apply the migration **CreateFieldTestMemberships**, which adds a table for participants with columns like **participant_id**, **experiment**, **variant**, and **converted** (boolean):

{% highlight sh %}
rails generate field_test:install
rails db:migrate
{% endhighlight %}

### Mounting
Add the following to `config/routes.rb` to create a route for the dashboard:

{% highlight rb %}
mount FieldTest::Engine, at: 'field_test'
{% endhighlight %}

In production, remember to secure your dashboard by mounting the engine inside of your admin block, so it won't be accessible to non-admin users. Something like this:

{% highlight rb %}
authenticate :user, ->(user) { user.admin? } do
  mount FieldTest::Engine, at: 'field_test'
end
{% endhighlight %}

### Configuration
Create a file `config/field_test.yml`. Here is the format to set up your first experiment:

{% highlight yml %}
experiments:
  my_experiment: # the name of the experiment
    description: # optional
    variants:
      - red
      - blue
    weights: # optional, defaults to even distribution
      - 55 # % of users assigned to red
      - 45 # % of users assigned to blue
{% endhighlight %}

### Variants
To implement your first test, you will need to initiate it somewhere, and then track when a conversion occurs at a later point. To do this, you will use the built-in methods `field_test(:my_experiment)` and `field_test_converted(:my_experiment)`. Since `field_test(:my_experiment)` creates a new record *and* returns which variant is being used, you could do any of the following.

For a controller:
{% highlight rb %}
def index
  @test_variant = field_test(:my_experiment)
end
{% endhighlight %}

For a helper:
{% highlight rb %}
def test_variant = field_test(:my_experiment)
{% endhighlight %}

For a view:
{% highlight erb %}
<% test_variant = field_test(:my_experiment) %>
{% endhighlight %}

This will assign the current user to an experiment and variant, based on cookies (default), IP address, or [ahoy_id](https://github.com/ankane/ahoy), depending on configuration (see docs for more details). Going forward, that user will always receive their assigned variant, until the experiment ends or a winner is selected (or if they delete the cookie).

Then, in the appropriate view:

{% highlight html %}
<button class=test_variant></button>
{% endhighlight %}

Or with view_components:
{% highlight erb %}
<!-- app/components/your_component.html.erb -->
<%= render YourComponent.new(test_variant) %>
{% endhighlight %}

Sometimes it may be necessary to access which variant the user is assigned to within a job, model or other context. To do this:

{% highlight rb %}
experiment = FieldTest::Experiment.find(:my_experiment)
variant = experiment.variant(user)
{% endhighlight %}

For our split test, we needed to create two distinct versions of a popup. With [view_component](https://viewcomponent.org/) this was fairly straightforward. The modal already existed as a component, so we just had to pass in which variant to use. From there, we could differentiate between them within the component class and accompanying view. This might look like:

{% highlight rb %}
#=> app/components/your_component.rb
class YourComponent < ViewComponent::Base
  def initialize(variant)
    @variant = variant
  end

  def heading
    variant == 'red' ? "Good ol' red" : 'True blue'
  end
end
{% endhighlight %}

The logic could also carry over the the component's `.html.erb` or `content` block.

### Participants

As mentioned, test participants can be assigned based on cookies, IP addresses, or **ahoy** IDs. To disable cookies for **field_test**, add `cookies: false` to your `field_test.yml` (without indentation). To track tests by user:

{% highlight rb %}
field_test(:my_experiment, participant: current_user)
{% endhighlight %}

To use **ahoy** IDs, include the following in your Application Controller:

{% highlight rb %}
def field_test_participant
  [ahoy.user, ahoy.visitor_token]
end
{% endhighlight %}

### Conversions

To evaluate the success rate for each design, we need to track each time a conversion occurs. This could appear in several places depending on the metric, but quite often will be in a controller action. For example, when a user signs up for a newsletter, we might use a **create** action to create a subscription. This is an ideal location to call `field_test_converted(:my_experiment)`:

{% highlight rb %}
#=> app/controllers/subscriptions_controller.rb
def create
  sub = current_user.subscription.create(subscription_params)
  field_test_converted(:my_experiment) if sub.save
end
{% endhighlight %}

You can also track multiple conversions for a particular experiment by adding the following to your `field_test.yml`:

{% highlight yml %}
experiments:
  my_experiment:
    goals:
      - first_goal
      - second_goal
{% endhighlight %}

Then to track that goal:

{% highlight rb %}
field_test_converted(:my_experiment, goal: 'first_goal')
{% endhighlight %}

A few things to note, it is important to ensure that you are only counting conversions when the exact events you are interested in take place. So if signups occur at *other* points in your application than where your experiment is occuring, make sure that those subscriptions are not counted as conversions, as a user could have been assigned to an experiment/variant previously.

Additionally, if the outcomes of a conversion differ between variants, you will need to ensure that your application performs the correct actions for that particular one.

### Results

Now that we've implemented split testing, we can monitor the performance of each variant to determine which design resonates best. To view results use the dashboard, which displays how many users have been assigned to each variant, each variant's conversion rate, as well as Bayesian stats of how each option is performing. Clicking into each experiment, you can see the individual records for assignments and conversions. Once your experiment has finished, you can end the test with the following configuration in your `field_test.yml` file:

{% highlight yml %}
experiments:
  my_experiment:
    winner: blue
{% endhighlight %}

You can also close an experiment to new participants while continuing to track existing ones:

{% highlight yml %}
experiments:
  my_experiment:
    closed: true
{% endhighlight %}

### Closing

For creating user-centric and efficient Rails applications, the **field_test** gem serves as a powerful yet accessible tool, enabling developers to conduct split testing with relative ease and precision. Whether tweaking a UI element or overhauling a page layout, insight gained from split testing is invaluable for steering your project in the right direction - happy testing!
