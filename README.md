# app-gitsync
CLI application to batch sync local git repos with cloud git providers

# Architecture
- Uses MVCS (Model-View-Controller-Service) code structure.
  - Controllers manages all logic and tasks.
  - Views manages all CLI i/o methods
  - Services manages all API methods, such as request and output formatting;
  - Models store all data, along with data specific methods.
- Example data flow:
  - Controller instantiates view, services, and models. 
  - When app starts or if CLI receives human input, Controller will begin a task.
  - A task can do the following:
    - CRUD operations directly on a model
    - pass the model to a service for API / Filesystem operations, which in turn does CRUD operations on the model.