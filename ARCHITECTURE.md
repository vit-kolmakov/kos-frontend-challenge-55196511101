# ARCHITECTURE

> Technical thought process

--- 

## Overview

I treated performance as the project's North Star and made every choice with an aggressively lean performance budget in mind. Seeing that there is only 16ms for the JavaScript to access the main thread and complete its work was quite stunning. This impressed upon me the need for wringing out every drop of performance I could from the rest of the application. The crucial decision was identifying that I would need to use a Web Worker early on, pretty much every other significant decision flowed from that.

---

## Tech Stack 

### Why Web Workers 

- There's a massive amount of data being streamed from the BE and everything I found on the topic of high-performance data optimizations on the web led me to this being the only real choice. Offloading the most critical and high load process from the main thread just makes too much sense.
- I had never used Web Workers before this but it was a really fun time learning about and using them. Aside from small gotchas in the form of string literals and keeping the file completely self-contained it was very straightforward to use it.
- It's really cool getting to see the separate track for them in the Performance Tab of the Browser DevTools.

### Why Angular 

- I personally love the async/sync state management stories native to the framework, Signals combined with Zoneless provide fine-grained reactivity.
- An equally robust and intuitive template system.
- Only major modern framework to treat Web Workers as first-class citizens, including built-in CLI support.  Also, the dependency injection system and structured services make it much easier to manage the complex asynchronous messaging patterns (postMessage/onMessage) required for  Web Worker communication without cluttering component logic.
- The framework is designed with large-scale enterprise applications front of mind, likely this is why KINEXON already uses it. Google invests a lot in making it easier for engineers to get the most out of the framework by offering resources like this: [Angular Docs](https://angular.dev/best-practices/runtime-performance).
- Built-in native APIs for interop with RxJS, it's tailor-made for data streams and would be there as an escape-hatch if I hadn't been able to land a performant solution otherwise. If there had been an express need for it, I could have leveraged RxJS Operators such as `.pipe(bufferTime(100))` or `.pipe(sampleTime(16))`, to preserve display consistency.
- Counter-Point: I did also consider Solid because I wanted the FE to be as lean as possible and Angular ships quite a lot more code to the browser but it doesn't have nearly as refined a Web Worker story, even when factoring in Vite. I do prefer the state management story though, though only slightly. While it does have a dedicated ecosystem of users and advocates, it's nowhere near as robust as Angular's. It's also not nearly as battle-tested even though it has been around for many years. The meta-framwork story for Solid is effectively on the same level as Angular's in my opinion, you can utilize SolidStart or TanStack Start, but that would have been another risk factor for me, since I don't know SolidStart well and I have only used TanStack Start with React.

### Why Vite

- I know Vite very well and I love working with it. It is the industry standard for build tools in my mind and has been the performance leader since it was in a pre-alpha state.
- The laundry list of benefits is too long to list here but the primary one is that it has a great Web Worker story, such as distinct code splitting for the web worker into a separate chunk and keeping it as light as possible. I didn't have time to verify the truth of this but per the LLMs:
 "Angular’s CLI worker implementation often forces the worker through a heavy bundling process that assumes it needs the full Angular runtime. Vite treats workers as lightweight entries.Vite also supports Worker Modules (type: 'module'), allowing use of native ESM import statements inside the worker, leading to smaller, faster-loading worker scripts. Native Support for Web Workers: Vite makes using Web Workers trivial. You can import a worker like new Worker(new URL('./worker.ts', import.meta.url)). This is perfect if you decide to move the SSE parsing off-thread."
- Vite is known for its incredibly fast dev server and HMR, it also provides more efficient asset bundling, this all saves quite a lot of development time.
- Vite is also much nicer to configure than standard Angular and it offers lots of modern niceties the framework would be left without otherwise. This was really easy when setting up the proxy for the KINEXON BE in the config.
- It is built atop Rolldown using the v8 beta and has first-party support for Oxlint and Oxfmt, the two fastest linting and formatting tools currently available in the industry.

### Why AnalogJS 

- First and foremost, I wanted access to Vite, and since Analog is a Vite plugin it was the simplest path to get that.
- Even though Analog is known for SSR it supports building strictly as an SPA and it's incredibly easy to do so. [Analog Docs](https://analogjs.org/docs/features/server/server-side-rendering#disabling-ssr)
- I was also able to bypass Nitro in favor of the BE data stream through the Vite proxy. This allowed avoiding extra overhead such as a needless layer of Node.js processing.
- Analog is quite a thin wrapper meta-framework, it is just a Vite plugin that uses the standard Angular CLI/Vite integration under the hood. 
- Once the app is bootstrapped in the browser, it is a standard Angular 21+ application. Analog doesn't add anything atop the rendering engine.

### Why Native CSS 

- Native CSS is incredibly performant compared to any modern UI library and it also means no added page weight. The browser is very good at rendering CSS and has countless optimizations in place to make it more performant, it would be careless not to take advantage of those benefits.
- Selfishly, I just really like learning CSS and working with it. I think it's fun. It's also a foundational web technology and that's a really good reason to lean on it.
- OKLCH is as a "Perceptually Uniform Color Space" and the modern choice for colors that are both performant, true to designs, and offer more accessibility. [Testimonial Article](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)

### Why GenAI/LLMs/Coding Agents/etc. 

- One of the most useful benefits of LLMs is learning, they can point us in directions we didn't know existed and backstop gaps in our mental models, but they demand you be disciplined in never trusting them. A great example is improving my Dockerfile, it definitely helped me make optimizations I wouldn't have known about or thought of but it also insisted that v20 is the current LTS of Node and it didn't realize that v24 is the current LTS until I informed it that today is 23.01.2026.
- If you're shrewd in using them where they're best they can provide a notable velocity boost when coding, the last I saw from reputable reports was +5%.
- Even though I primarily use the Gemini models they are still unfamiliar with all of the intricacies of Angular and I had to repeatedly insist on not using React and frequently coax them into making better use of the Angular APIs.

---

## Design Decisions

### Performance Considerations

- Routinely checking the browser for changes in FPS
- Periodically recording performance profiles
- Angular specific browser dev tools and framework optimizations such as Standalone, OnPush, and Zoneless
- Keeping the client bundle as lean as possible
- Moving as much logic as is sensible out of the TypeScript and into the HTML so that Angular/CSS are in charge of optimization 
- See [KINEXON-FRONTEND_FRAME-COUNT](./public/KINEXON-FRONTEND_FRAME-COUNT) 

### Key Optimizations, Known Limitations, & Trade-Offs

- In addition to the following examples of tough performance decisions I tried to comment the code very heavily to provide much greater context for what choices were made and why, especially where micro-optimizations were concerned.
- Structured Clone vs Zero-Copy Transferable Object
  - I had no knowledge about the difference between these two approaches beforehand but after I had landed the legacy approach with the Structured Clone I learned that there was a Structured Clone Latency that occurred due to the copying process and this made the benefits of the Zero-Copy Transferable Object too alluring to resist. That was the main reason I decided to rework it to use the Float64Array.
  - LLM Explainer:
  ```
  In standard web development, when you send data between a Worker and the Main Thread, the browser performs a "Structured Clone." This is essentially a deep copy operation where every piece of data is serialized, moved, and then reconstructed in a new memory location. For high-frequency data (like 250+ updates every 100ms), this creates significant CPU overhead and generates a massive amount of "garbage" that the Garbage Collector must eventually clean up, potentially causing frame drops.
  "Zero-Copy" via Transferable Objects (like the ArrayBuffer underlying a Float64Array) bypasses this entirely. Instead of copying the data, the Worker "surrenders" ownership of the specific memory address to the Main Thread. The data stays exactly where it is in physical RAM; the browser just changes which thread is allowed to read it. It is called "Zero-Copy" because the bits never move—only the permission to access them does.
  Performance Benefits Analysis
  ```
- requestAnimationFrame() vs Signal-Triggered "Heartbeat" Updates 
  - The legacy approach to the Canvas rendering was done using requestAnimationFrame (RAF) and even though it was really performant it was also inconcistent. At times it seeemed like the FPS would get unexpectedly choppy so I wanted to slow down the number of updates to match the BE frequency instead of just performing so many more rendering cycles for very little perceived gain.
  - LLM Explainer:
  ```
  1. CPU/GPU Usage: On a 165Hz monitor, your previous version called #render() 165 times per second. The reactive version calls it 10 times per second (matching the 100ms backend interval). This is a 94% reduction in draw calls.
  2. Battery Life: For mobile or laptop users, this significantly reduces the power consumed by the Javascript engine and the GPU rasterizer.
  3. Main Thread Availability: Because the UI isn't busy drawing identical frames, the main thread is more available to handle user clicks and Sidebar interactions.
  The Downside (Why people use RAF)
  The only reason to stick with requestAnimationFrame is if you wanted to implement Linear Interpolation (Lerp). If you want the assets to "slide" smoothly between points over that 100ms gap, you need the high-frequency loop. Since the current requirement is just to "Update object positions smoothly as new data arrives," the reactive signal approach is actually the more "Senior" choice for efficiency.
  ```

### Prospective Improvements

These are all ideas I had for improvements as I worked through the coding challenge and with more time I would've liked to add.
- There was no mention of dedicated unit/integration/E2E tests so I treated it as a stretch goal but I would've added [Vitest](https://vitest.dev/guide/). 
- I would've added validation to the Angular resource signals via [Valibot](https://valibot.dev/guides/introduction/) to offer end-to-end type safety for the entire FE.
- Caching of metadata for repeat assets so that it doesn't need to be refetched would be a good improvement. With enough time to think about it, it's possible there could even be some caching opportunities for the telemetry data.
- A technical spike to see if [Angular Aria](https://angular.dev/guide/aria/overview) could offer better accessibility with low overhead would be nice, especially if the UI gains more complexity. 
- With a better grasp of the Canvas UI and drawing APIs I would've liked to have added more robust overlays to the MapComponent.
- I don't know enough about the browser's native drawing APIs to say for certain but there might be an opportunity to better leverage the GPU for even more performance on suitable machines. A new library called [TypeGPU](https://docs.swmansion.com/TypeGPU/) released last year that would offer a TypeSafe and performant means of interacting with it while still being able to use TypeScript.  
- Since the SSE stream is uni-directional, another option would be to leverage WebTransport running over HTTP/3 if trying to keep in mind scaling up to 100,000+ assets. If a bi-directional protocol was preferred gRPC would be available as well, which would be well supported using a Go BE.

#### LLM Suggestions

I didn't come up with these ideas but they do sound good so I am gonna include them.
- Interpolation (Lerp): Moving back to the 165Hz loop to interpolate positions between 100ms updates for "butter-smooth" motion.
- Map Zoom/Pan: Implementing transformation matrices to allow users to zoom into crowded factory floor areas.

---
