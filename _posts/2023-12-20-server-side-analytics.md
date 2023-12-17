---
layout: post
title:  Custom Google Analytics with Rails
date:   2023-12-20 12:00:00
tags: rails tutorial
---

<img class="post-pic" src="/assets/images/posts/server-side-analytics.jpg" alt="Google Analytics">

Have you ever wondered how users interact with your applications - where they visit, what they click? Collecting metrics like these for a site can provide invaluable insights into your audience's behavior.

This is where analytics comes in - **Google Analytics** is a free web analytics service that can help you to better understand how many people are visiting your site, where they're coming from (search engines, direct links, social media), and their general geographical location. You can also track engagement - how long users stay on your site, which pages they visit, and their navigation paths, as well as other interactions like signing up for mailers, filling out forms, or making purchases. Finally and crucially, data can all be obtained anonymously, protecting users privacy.

This all makes analytics indispensable for web developers and marketers alike. It can be a comprehensive tool for understanding users, guiding design decisions and content creation, and ultimately optimizing web experiences. Whether you're a small startup or a large enterprise, integrating analytics into your application can offer key insights and a competitive edge in the digital marketplace.

A new iteration, Google Analytics 4 (GA4), came out earlier this year, replacing the old Universal Analytics. To set it up for your app, visit [**Google Analytics**](https://analytics.google.com) and create an account and a new **property** (your project). This process is fairly straightforward - once finished you will be able to set up a **data stream**, which will provide you with a measurement ID and allow you to configure client-side analytics.

### Client-side
**Client-side** analytics are tracked from a user's browser via JavaScript. Setting up client-side GA4 is fairly simple - after setting up an account and your property with a data stream, just add the following to the **head** of your application (replacing the ID with your own measurement ID):

{% highlight html %}
#=> app/views/_analytics.html.erb
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1234567890"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());

  gtag('config', 'G-1234567890');
</script>
{% endhighlight %}

Abstract it out into its own partial:

{% highlight ruby %}
#=> app/views/layouts/application.html.erb
<!DOCTYPE html>
<html>
<head>
  <%= render 'analytics' %>
</head>
...
{% endhighlight %}

Once you have this added, Google will begin collecting data for you - page views, scrolls, form interactions, video plays, and so on. Be aware it may take a while for data to populate your dashboard. Also worth noting, client-side GA4 will not work if users have disabled JavaScript.

### Server-side
While client-side analytics is relatively commonplace, there are scenarios where tracking custom interactions or conversions with **server-side** tracking is more useful for understanding and improving engagement for a web application. This method bypasses client-side issues like ad blockers or disabled or limited JavaScript (especially relevant in mobile environments) and tracks through the app itself; it can convert events that may not occur client-side, like controller actions and services. This can ensure a more comprehensive capture of user interactions across devices.

This post is meant help guide you through setting up a server-side Google Analytics integration in a Ruby on Rails application.

First, it is crucial to understand how GA4 works - take time to review the [**docs**](https://developers.google.com/analytics/devguides/collection/protocol/ga4) (you can ignore the `app_instance_id` bit of the request body). Our strategy will be to make an **API service** in conjunction with an **"event factory"** and a **background worker** to post custom events asynchronously for the actions we want to monitor. You will need your property's measurement ID, as well as a secret key that you can set up by navigating through Admin > Data Streams > select your stream > Measurement Protocol > Create.

### API Service
Our first step will be to create an API service that will handle posting custom events. To do this, you will need to post a JSON payload to `https://www.google-analytics.com/mp/collect`.

Here's an example of how you could set up this service using the **Faraday** gem:

{% highlight ruby %}
#=> app/services/analytics_api.rb
class AnalyticsApi
  class << self
    def track(conversion)
      conn = Faraday.new(url: 'https://www.google-analytics.com/mp/collect')
      conn.post do |route|
        route.params['measurement_id'] = YOUR_MEASUREMENT_ID
        route.params['api_secret'] = YOUR_API_SECRET
        route.headers['Content-Type'] = 'application/json'
        route.body = conversion # JSON payload
      end
    end
  end
end
{% endhighlight %}

### Event factory
Once you've got your API service set up, you can customize which conversions you would like to send to Analytics. First and foremost, it is important to understand what type of payload Google Analytics is expecting. Next, you should determine what data the client would like to track. For our project, since we ended up sending most of our events from controllers, we were able to pass along information that had already been captured as **params**. Your factory to build an analytics payload might look something like this:

{% highlight ruby %}
#=> app/services/analytics_factory.rb
class AnalyticsFactory
  class << self
    def monthly_membership
      params = {
        currency: 'USD',
        value: 50.0,
        category: 'monthly'
      }

      return event('membership', params)
    end

    def purchase(item, price)
      params = {
        currency: 'USD',
        value: price,
        items: [
          item_name: item
        ]
      }

      return event('purchase', params)
    end

    private

    def event(name, params)
      { # this is the general structure
        events: [
          {
            name: name,
            params: {
              ...
            }
          }
        ]
      }.to_json
    end
  end
end
{% endhighlight %}

Which parameters you choose to track is entirely up to you, but here are some potential types you might pass through:
- event sources
- categories
- values
- currency
- frequency

### Background worker
Now that we have a factory to create our payload and an API to post it with, we can perform a job through background processors like ActiveJob or Sidekiq to send the event asynchronously. For example:

{% highlight ruby %}
#=> app/workers/analytics_worker.rb
class AnalyticsWorker < ActiveJob::Base
  def perform(conversion)
    AnalyticsApi.track(conversion)
  end
end
{% endhighlight %}

### Posting to Analytics
Finally, it's time to post our event - let's tie it all together. Here is how it might look to pass along params from within a controller:

{% highlight ruby %}
#=> app/controllers/your_controller.rb
def create
  conversion = AnalyticsFactory.your_event(your_params)
  AnalyticsWorker.perform_later(conversion)
end
{% endhighlight %}

To summarize, since there are several moving parts:
1. The factory builds the JSON payload for our event, plugging in information that we want to track.
2. This payload is passed along to the API service, which posts the event to Google Analytics via a background worker for asynchronous processing.
3. This can all be done from within a controller action, which allows us to pinpoint where key events like form submissions or purchases occur, and to pass desired params along to the API/factory services. 

This sequence can also be called from within another service pipeline or background worker - perhaps you can think of more places you could post events to Google Analytics from.

### Testing
You may want to set up a property just for testing and development, with its own measurement ID/secret key. This can be done by storing your development configuration in your `application.yml`/`.env`/credentials, while configuring production with your main ID and secret. First, ensure your local setup correctly sends events to Google Analytics with the appropriate data. Then, you can build out tests for your factory events and API calls to ensure thorough coverage and proper payloads:

{% highlight ruby %}
RSpec.describe AnalyticsFactory do
  it 'structures purchase event' do
    event = AnalyticsFactory.purchase('painting', 250.0)
    expected = {
      events: [
        {
          name: 'purchase',
          params: {
            currency: 'USD',
            value: 250.0,
            items: [
              { item_name: 'painting' }
            ]
          }
        }
      ]
    }
    expect(event).to eq(expected)
  end
end
{% endhighlight %}

Once tested, you're ready to deploy your changes to production and begin tracking your new custom conversions.

### Closing
Server-side event tracking with Rails offers robust and flexible analytics capabilities. Whether tracking revenue, signups, subscriptions or other custom events, this approach provides a secure and reliable way to gather useful insight into user behavior. Remember, the key to successful analytics is not just collecting data, but interpreting it to make informed decisions for your application's growth and user satisfaction. Happy tracking!
