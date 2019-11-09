# app-gitsync
CLI application to batch sync local git repos with cloud git providers

# Code Architecture
- Uses MVCS (Model-View-Controller-Service) code structure.
  - Controllers manages all logic and tasks.
  - Views manages all CLI i/o interactions.
  - Models store all data, along with data specific methods.
  - Services manages all API methods, such as request and output formatting.
- Example program flow:
  - Controller stores instances of view, services, and models. 
  - Controller receives user input on CLI view or lifecycle events and makes calls to model, service or view objects
    - Do CRUD operations directly on a model by using a model's CRUD methods.
    - Pass the model to a service for API / Filesystem operations, which in turn does CRUD operations on the model by using a model's CRUD methods.
    - Pass the model to the view for rendering.