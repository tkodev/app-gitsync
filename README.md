# app-gitsync
CLI application to batch sync local git repos with cloud git providers

# Code Architecture
- Uses MVCS (Model-View-Controller-Service) code structure.
  - Models store all data, along with data specific methods, including API clals.
  - Views manages all CLI human interactions.
  - Controllers manages all logic and tasks.
- Example program flow:
  - Controller stores instances of models and views. 
  - Controller receives user input on CLI view or lifecycle events and makes calls to model and view objects
    - Do CRUD operations directly on a model by using a model's CRUD methods.
    - Pass the model to the view for rendering.