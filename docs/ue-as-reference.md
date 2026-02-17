# Unreal Engine Angelscript Reference

Comprehensive reference for scripting in Unreal Engine using Angelscript.
Covers UE5 integration patterns, blueprint interop, networking, and more.

Source: [angelscript.hazelight.se](http://angelscript.hazelight.se/)

## Scripting Introduction

This introduction will run you through how to create your first Actor class in script, and how to interact with it in unreal and blueprint.

### Setup

Make sure you have the following set up:

- Install or compile the custom engine build for UnrealEngine-Angelscript.
- Install [Visual Studio Code](https://code.visualstudio.com/).
- Install the [Unreal Angelscript Extension](https://marketplace.visualstudio.com/items?itemName=Hazelight.unreal-angelscript) for visual studio code.

> See the [Installation](/getting-started/installation/) page for details.

### Starting the Project

- Start the custom unreal editor and open your project.
 Opening your project will automatically create an empty `Script/` folder inside your project folder.
- Start Visual Studio Code, and from the menu `File -> Open Folder`, open your new `MyProject/Script/` folder.

> **Tip:** You can also click the "Open Angelscript workspace" option from the Tools menu to automatically open the scripts folder in Visual Studio Code. ![](/img/open-workspace.png)

### Creating the Actor Class

Within Visual Studio Code, create a new file and call it `IntroductionActor.as`.

Files with the `.as` extension placed under your project's `Script/` folder are automatically loaded by the angelscript plugin.

Inside `IntroductionActor.as`, let's declare a new Actor class:

```angelscript
class AIntroductionActor : AActor
{
}
```

We've now created our first scripted Actor!

### Placing the Actor in Unreal

Immediately after hitting "Save" on our script file, it should become available within the unreal editor.

- Open the `Place Actors` panel (this can be found in Unreal's `Window` menu if you don't have it open already).
- Search for "Introduction Actor". Your new scripted actor should appear in the list.
- Place the "Introduction Actor" into your level.

![](/img/place-actors.png)

### Adding Functionality to the Actor

We have a totally empty actor in the level now with no functionality. As an example, let's make this actor perform a configurable countdown:

```angelscript
class AIntroductionActor : AActor
{
    UPROPERTY()
    float CountdownDuration = 5.0;

    float CurrentTimer = 0.0;
    bool bCountdownActive = false;

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // Start the countdown on beginplay with the configured duration
        CurrentTimer = CountdownDuration;
        bCountdownActive = true;
    }

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaSeconds)
    {
        if (bCountdownActive)
        {
            // Count down the timer 
            CurrentTimer -= DeltaSeconds;

            if (CurrentTimer <= 0.0)
            {
                // The countdown was complete!
                // Print a message to the screen
                Print("Countdown was completed!");
                bCountdownActive = false;
            }
        }
    }
}
```

Some of the important things that are happening here:

- The `CountdownDuration` variable has been declared as a `UPROPERTY()`, this makes it configurable from the Unreal editor. You can select the actor in the level and change the countdown duration to be higher or lower than the default 5 seconds.
 *See the documentation on [Properties and Accessors](/scripting/properties-and-accessors/)*
 ![](/img/countdown-duration.png)
- We override the `BeginPlay` and `Tick` events to implement functionality on the actor.
 *See the documentation on [Functions and BlueprintEvents](/scripting/functions-and-events/)*
- When BeginPlay happens, we start our countdown.
- When Tick happens, we count down the countdown and check if it's complete.
- After the countdown is done, we use `Print()` to show a message on screen.

Now, if you play the level the actor is placed in and wait 5 seconds, you will see the message appear: ![](/img/countdown-print.png)

### Adding Components to the Actor

Right now, our Actor is still empty of any components, and only implements some functionality on tick.

Let's add some components to it! We want a `Scene Component` as the root, and then attach a `Static Mesh Component` and a `Billboard Component` to it.

Add the following at the top of your actor code:

```angelscript
class AIntroductionActor : AActor
{
    UPROPERTY(DefaultComponent, RootComponent)
    USceneComponent SceneRoot;

    UPROPERTY(DefaultComponent, Attach = SceneRoot)
    UStaticMeshComponent Mesh;

    UPROPERTY(DefaultComponent, Attach = SceneRoot)
    UBillboardComponent Billboard;

....
```

When you save your script file, you should see the new components appear on the Introduction Actor you've placed in the level.

You can read more about adding components on the [Actors and Components](/scripting/actors-components/) page.

![](/img/intro-components.png)

> **Tip:** Clicking one of the *"Edit in C++"* links in the components menu will jump your Visual Studio Code to the place the component is added in your script.
>  The angelscript plugin often hooks into Unreal's normal C++ functionality, so script classes behave like C++ classes in many ways.

### Creating a Blueprint Actor

The actor now has a Static Mesh Component, but we can't see it because no Static Mesh has been chosen on it!

We could of course select the actor in the level and choose one, but we don't want to do that for each actor we place individually.

Instead, let's create a Blueprint of our new introduction actor:

- Open the Content Browser, and click `Add -> Blueprint Class`, to use the normal way to create a new blueprint.
- When asked to pick a Parent Class, search for our "Introduction Actor" and select it:
 ![](/img/bp-pickparent.png)
- Let's call our new blueprint `BP_IntroductionActor`, so it's clear that we're dealing with an actor blueprint.
- Now we can open our new blueprint and choose a mesh for its Static Mesh Component.
 Here I am choosing the engine's standard `SM_Cube` mesh, but feel free to choose one of your own.
 ![](/img/choose-staticmesh.png)
- Make sure to remove the existing `IntroductionActor` from your level, and place a new `BP_IntroductionActor` in the level so we can see it!

### Calling in and out of Blueprint

Now that we have a blueprint, we can change the script to work together with its node graph:

- We will change the actor so the countdown is no longer started right away, but requires a function call to start it.
- We also add an overridable blueprint event so our actor blueprint can be notified when the countdown is finished.

In our `IntroductionActor.as`, change the script code for its BeginPlay and Tick functions to this:

```angelscript
    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // We no longer start the countdown on BeginPlay automatically
    }

    UFUNCTION()
    void StartCountdown()
    {
        // Start the countdown when StartCountdown() is called 
        CurrentTimer = CountdownDuration;
        bCountdownActive = true;
    }

    /**
     * Declare an overridable event so the actor blueprint can
     * respond when the countdown finishes
     */
    UFUNCTION(BlueprintEvent)
    void FinishedCountdown() {}

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaSeconds)
    {
        if (bCountdownActive)
        {
            // Count down the timer 
            CurrentTimer -= DeltaSeconds;

            if (CurrentTimer <= 0.0)
            {
                // The countdown was complete!
                // Print a message to the screen
                Print("Countdown was completed!");
                // Also: trigger a blueprint event
                FinishedCountdown();
                bCountdownActive = false;
            }
        }
    }
```

After saving this change, we can now open `BP_IntroductionActor`, and add nodes like this:

![](/img/intro-bpnodes.png)

Now, the blueprint must specifically start the countdown, and when the countdown is finished the blueprint will automatically destroy the actor.

If you play the level with the blueprint placed, you will see it disappear after 5 seconds.

## Script Examples

The `UnrealEngine-Angelscript` project contains a `Script-Examples/` folder.
Here, you can find more detailed example scripts that you can read or copy to your project.

-  
One good place to start is the [Example_MovingObject.as](https://github.com/Hazelight/UnrealEngine-Angelscript/blob/angelscript-master/Script-Examples/Examples/Example_MovingObject.as) actor example.

-  
You can also look through the [Examples Folder on Github](https://github.com/Hazelight/UnrealEngine-Angelscript/tree/angelscript-master/Script-Examples/Examples).

## Further Reading

More documentation is available on this website in the sidebar to the left.

We recommend reading through at least the "Script Features" pages to get an overview of what can be done in scripts.

Some good starting points are:

- [Functions and BlueprintEvents](/scripting/functions-and-events/)
- [Function Libraries](/scripting/function-libraries/)
- [Differences with Unreal C++](/scripting/cpp-differences/)

## Functions and BlueprintEvents

### Plain Script Functions

Functions can be declared as methods in a class or globally. By default any function you declare can only be called from script and is not accessible to blueprint.

```angelscript
class AExampleActor : AActor
{
    void MyMethod()
    {
        MyGlobalFunction(this);
    }
}

void MyGlobalFunction(AActor Actor)
{
    if (!Actor.IsHidden())
    {
        Actor.DestroyActor();
    }
}
```

### Functions that can be called from Blueprint

To make it so a function can be called from blueprint, add a `UFUNCTION()` specifier above it.

```angelscript
class AExampleActor : AActor
{
    UFUNCTION()
    void MyMethodForBlueprint()
    {
        Print("I can be called from a blueprint!");
    }
}
```

> **Note:** Unlike in C++, it is not necessary to specify `BlueprintCallable`, it is assumed by default.

### Overriding BlueprintEvents from C++

To override a Blueprint Event declared from a C++ parent class, use the `BlueprintOverride` specifier. You will use this often to override common events such as `BeginPlay` or `Tick`:

```angelscript
class AExampleActor : AActor
{
    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        Print("I am a BeginPlay override");
    }

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaSeconds)
    {
        Print("I get called every tick");
    }
}
```

The visual studio code extension has helpers for easily overriding blueprint events from parent classes.

When the cursor is within a class, you can click the Lightbulb icon (or press Ctrl + . by default) to choose a function to override:

![](/img/override-lightbulb.png)

Typing the name of an overridable event also suggests a completion for the full function signature:

![](/img/override-completion.png)

> **Note:** For C++ functions that don't explicitly specify a `ScriptName` meta tag, some name simplification is automatically done to remove common prefixes.
>  For example, the C++ event is called `ReceiveBeginPlay`, but the preceeding `Receive` is removed and it just becomes `BeginPlay` in script.
>  Other prefixes that are removed automatically are `BP_`, `K2_` and `Received_`.

### Overriding a Script Function from Blueprint

Often you will want to create a blueprint that inherits from a script parent class. In order to make a function so it can be overridden from a child blueprint, add the `BlueprintEvent` specifier.

```angelscript
class AExampleActor : AActor
{
    UFUNCTION(BlueprintEvent)
    void OverridableFunction()
    {
        Print("This will only print if not overridden from a child BP.");
    }
}
```

> **Note:** Script has no split between `BlueprintImplementableEvent` and `BlueprintNativeEvent`
>  like C++ has. All script functions require a base implementation, although it can be left empty.

#### Tip: Separate Blueprint Events

One pattern that is employed often in Unreal is to have separate base and blueprint events. This way you can guarantee that the script code always runs in addition to nodes in the child blueprint, and you will never run into issues if the blueprint hasn't done "Add call to parent function".

For example, a pickup actor might do:

```angelscript
class AExamplePickupActor : AActor
{
    void PickedUp()
    {
        // We always want this script code to run, even if our blueprint child wants to do something too
        Print(f"Pickup {this} was picked up!");
        SetActorHiddenInGame(false);

        // Call the separate blueprint event
        BP_PickedUp();
    }

    // Allows blueprints to add functionality, does not contain any code
    UFUNCTION(BlueprintEvent, DisplayName = "Picked Up")
    void BP_PickedUp() {}
}
```

![](/img/bp-override.png)

### Global Functions

Any script function in global scope can also have `UFUNCTION()` added to it. It will then be available to be called from any blueprint like a static function.

This lets you create functions not bound to a class, similar to how Blueprint Function Libraries work.

```angelscript
// Example global function that moves an actor somewhat
UFUNCTION()
void ExampleGlobalFunctionMoveActor(AActor Actor, FVector MoveAmount)
{
    Actor.ActorLocation += MoveAmount;
}
```

![](/img/example-global-function.png)

> **Tip:** Comments above function declarations become tooltips in blueprint, just like in C++

### Calling Super Methods

When overriding a script function with another script function, you can use the same `Super::` syntax from Unreal to call the parent function. Note that script methods can be overridden without needing `BlueprintEvent` on the base function (all script methods are virtual). However, when overriding a `BlueprintEvent`, you *will* need to specify `BlueprintOverride` on the overrides.

```angelscript
class AScriptParentActor : AActor
{
    void PlainMethod(FVector Location)
    {
        Print("AScriptParentActor::PlainMethod()");
    }

    UFUNCTION(BlueprintEvent)
    void BlueprintEventMethod(int Value)
    {
        Print("AScriptParentActor::BlueprintEventMethod()");
    }
}

class AScriptChildActor : AScriptParentActor
{
    // Any script method can be overridden
    void PlainMethod(FVector Location) override
    {
        Super::PlainMethod(Location);
        Print("AScriptChildActor::PlainMethod()");
    }

    // Overriding a parent BlueprintEvent requires BlueprintOverride
    UFUNCTION(BlueprintOverride)
    void BlueprintEventMethod(int Value)
    {
        Super::BlueprintEventMethod(Value);
        Print("AScriptChildActor::BlueprintEventMethod()");
    }
}
```

> **Note:** When overriding a C++ `BlueprintNativeEvent`, it is not possible to call the C++ Super method due to a technical limitation. You can either prefer creating `BlueprintImplementableEvent`s, or put the base implementation in a separate callable function.

## Properties and Accessors

### Script Properties

Properties can be added as variables in any script class. The initial value of a property can be specified in the class body.

By default any plain property you declare can only be used from script and is not accessible to blueprint or in the editor.

```angelscript
class AExampleActor : AActor
{
    float ScriptProperty = 10.0;
}
```

### Editable Properties

To expose a property to unreal, add a `UPROPERTY()` specifier above it.

```angelscript
class AExampleActor : AActor
{
    // Tooltip of the property
    UPROPERTY()
    float EditableProperty = 10.0;
}
```

![](/img/editable-property.png)

> **Note:** It is not necessary to add `EditAnywhere` to properties in script. Unlike in C++, this is assumed as the default in script.

To be more specific about where/when a property should be editable from the editor UI, you can use one of the following specifiers:

```angelscript
class AExampleActor : AActor
{
    // Can only be edited from the default values in a blueprint, not on instances in the level
    UPROPERTY(EditDefaultsOnly)
    float DefaultsProperty = 10.0;

    // Can only be edited on instances in the level, not in blueprints
    UPROPERTY(EditInstanceOnly)
    FVector InstanceProperty = FVector(0.0, 100.0, 0.0);

    // The value can be seen from property details anywhere, but *not* changed
    UPROPERTY(VisibleAnywhere)
    FName VisibleProperty = NAME_None;

    // This property isn't editable anywhere at all
    UPROPERTY(NotEditable)
    TArray<int> VisibleProperty;
}
```

### Blueprint Accessible Properties

When a property is declared with `UPROPERTY()`, it also automatically becomes usable within blueprint:

![](/img/bp-properties.png)

To limit the blueprint from reading or writing to the property, you can use one of the following specifiers:

```angelscript
class AExampleActor : AActor
{
    // This property can be both read and written from blueprints
    UPROPERTY()
    float BlueprintProperty = 10.0;

    // This property can use `Get` nodes in blueprint, but not `Set` nodes
    UPROPERTY(BlueprintReadOnly)
    float ReadOnlyProperty = 0.0;

    // This property cannot be accessed by blueprint nodes at all
    UPROPERTY(BlueprintHidden)
    int NoBlueprintProperty = 5;
}
```

> **Note:** It is not necessary to add `BlueprintReadWrite` to properties in script. Unlike in C++, this is assumed as the default in script.

### Categories

It can be helpful to specify a `Category` for your properties. Categories help organize your properties in the editor UI:

```angelscript
class AExampleActor : AActor
{
    UPROPERTY(Category = "First Category")
    float FirstProperty = 0.0;

    UPROPERTY(Category = "Second Category")
    float SecondProperty = 0.0;

    UPROPERTY(Category = "Second Category|Child Category")
    FString ChildProperty = "StringValue";
}
```

![](/img/property-categories.png)

## Property Accessor Functions

Script methods that start with `Get..()` or `Set..()` can use the `property` keyword to allow them to be used as if they are properties. When the property value is used within other code, the appropriate Get or Set function is automatically called:

```angelscript
class AExampleActor : AActor
{
    // The `property` keyword lets this function be used as a property instead
    FVector GetRotatedOffset() const property
    {
        return ActorRotation.RotateVector(FVector(0.0, 1.0, 1.0));
    }

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // This automatically calls GetRotatedOffset() when used as a property
        Print("Offset at BeginPlay: "+RotatedOffset);
    }
}
```

### Property Accessors in C++ Binds

Note that *all* C++ binds can be used as property accessors regardless. That means that any C++ function that starts with `Get...()` can be accessed as a property.

This lets you access things such as `Actor.ActorLocation` as a property. For C++ binds, both forms are valid, so `ActorLocation` and `GetActorLocation()` produce the same result.

## Access Modifiers

If you want a property or function to be `private` or `protected` in script, each individual property needs to be specified that way:

```angelscript
class AExampleActor : AActor
{
    private FVector Offset;
    protected bool bIsMoving = false;

    bool IsMoving() const
    {
        return bIsMoving;
    }

    protected void ToggleMoving()
    {
        bIsMoving = !bIsMoving;
    }
}
```

Properties that are `private` cannot be accessed at all outside the class they are declared in. Properties that are `protected` can only be accessed by the class itself and its children.

> **Tip:** Access modifiers work for functions as well as for properties.

## Actors and Components

Actors and components are two of the fundamental gameplay types in unreal code.

Creating a new actor or component type in script is as simple as creating a new script file and adding a class that inherits from an actor type:

```angelscript
class AMyActor : AActor
{
}

class UMyComponent : UActorComponent
{
}
```

> **Note:** The script plugin automatically sets the most useful class flags for any script classes, adding a `UCLASS()` specifier is not necessary in script, but can still optionally be used to configure additional class settings.

### Default Components

Unlike in C++, script classes do not make use of their constructors for creating components. To add a default component to the actor, use the `DefaultComponent` specifier for them. Default components are automatically created on the actor when it is spawned.

The following class will have two components on it when placed. A scene component at the root, and the custom `UMyComponent` we declared before:

```angelscript
class AExampleActor : AActor
{
    UPROPERTY(DefaultComponent)
    USceneComponent SceneRoot;
    UPROPERTY(DefaultComponent)
    UMyComponent MyComponent;
}
```

### Component Attachments

Likewise, the default attachment hierarchy is specified in `UPROPERTY` specifiers, rather than set up in a constructor. Use the `Attach =` and `AttachSocket =` specifiers.

If an explicit attachment is not specified, the component will be attached to the actor's root.

```angelscript
class AExampleActor : AActor
{
    // Explicit root component
    UPROPERTY(DefaultComponent, RootComponent)
    USceneComponent SceneRoot;

    // Will be attached to SceneRoot by default, as no attachment is specified
    UPROPERTY(DefaultComponent)
    USkeletalMeshComponent CharacterMesh;

    // Will be attached to the CharacterMesh' RightHand socket
    UPROPERTY(DefaultComponent, Attach = CharacterMesh, AttachSocket = RightHand)
    UStaticMeshComponent WeaponMesh;

    // Will be attached to the WeaponMesh
    UPROPERTY(DefaultComponent, Attach = WeaponMesh)
    UStaticMeshComponent ScopeMesh;
}
```

![](/img/attach-hierarchy.png)

> **Note:** You can explicitly note which component should be the default root component with the `RootComponent` specifier. If you do not add this specifier, the first component to be created will become the root.

### Default Statements

To assign default values to properties on the actor's components, you can use `default` statements:

```angelscript
class AExampleActor : AActor
{
    UPROPERTY(DefaultComponent, RootComponent)
    USceneComponent SceneRoot;

    UPROPERTY(DefaultComponent)
    USkeletalMeshComponent CharacterMesh;

    // The character mesh is always placed a bit above the actor root
    default CharacterMesh.RelativeLocation = FVector(0.0, 0.0, 50.0);

    UPROPERTY(DefaultComponent)
    UStaticMeshComponent ShieldMesh;

    // The shield mesh is hidden by default, and should only appear when taking damage
    default ShieldMesh.bHiddenInGame = true;
    // The shield mesh should not have any collision
    default ShieldMesh.SetCollisionEnabled(ECollisionEnabled::NoCollision);
}
```

### Working with Components

#### Retrieving Components

If you have an actor and want to find a component of a type on it, use `UMyComponentClass::Get()`:

```angelscript
AActor Actor;

// Retrieve the first skeletal mesh component we can find on the actor
USkeletalMeshComponent SkelComp = USkeletalMeshComponent::Get(Actor);

// Find the specific skeletal mesh component with this component name
USkeletalMeshComponent WeaponComp = USkeletalMeshComponent::Get(Actor, n"WeaponMesh");
```

If no component of the specified type exists, this will return `nullptr`.

Use `UMyComponentClass::GetOrCreate()` to retrieve a potential existing component, or create it if one does not exist already:

```angelscript
// Find our own interaction handling component on the actor.
// If it does not exist, create it.
UInteractionComponent InteractComp = UInteractionComponent::GetOrCreate(Actor);

// Find an interaction handling component specifically named "ClimbingInteraction",
// or create a new one with that name
auto ClimbComp = UInteractionComponent::GetOrCreate(Actor, n"ClimbingInteraction");
```

#### Adding New Components

Creating a new component works similarly by calling `UMyComponentClass::Create()`. Specifying a component name is optional, if none is specified one will be automatically generated.

```angelscript
ACharacter Character;

// Create a new static mesh component on the character and attach it to the character mesh
UStaticMeshComponent NewComponent = UStaticMeshComponent::Create(Character);
NewComponent.AttachToComponent(Character.Mesh);
```

> **Tip:** If you have a dynamic `TSubclassOf<>` or `UClass` for a component class, you can also use the generic functions on actors for these operations by using `Actor.GetComponent()`, `Actor.GetOrCreateComponent()`, or `Actor.CreateComponent()`

### Spawning Actors

Actors can be spawned by using the global `SpawnActor()` function:

```angelscript
// Spawn a new Example Actor at the specified location and rotation
FVector SpawnLocation;
FRotator SpawnRotation;
AExampleActor SpawnedActor = SpawnActor(AExampleActor, SpawnLocation, SpawnRotation);
```

#### Spawning a Blueprinted Actor

It is often needed to dynamically spawn an actor blueprint, rather than a script actor baseclass. To do this, use a `TSubclassOf<>` property to reference the blueprint, and use the global `SpawnActor()` function.

An example of a spawner actor that can be configured to spawn any blueprint of an example actor:

```angelscript
class AExampleSpawner : AActor
{
    /**
     * Which blueprint example actor class to spawn.
     * This needs to be configured either in the level,
     * or on a blueprint child class of the spawner.
     */
    UPROPERTY()
    TSubclassOf<AExampleActor> ActorClass;

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        FVector SpawnLocation;
        FRotator SpawnRotation;

        AExampleActor SpawnedActor = SpawnActor(ActorClass, SpawnLocation, SpawnRotation);
    }
}
```

### Construction Script

Actor construction script can be added by overriding the `ConstructionScript()` blueprint event. From construction scripts, you can create new components and override properties like normal.

For example, an actor that creates a variable amount of meshes inside it based on its settings in the level could look like this:

```angelscript
class AExampleActor : AActor
{
    // How many meshes to place on the actor
    UPROPERTY()
    int SpawnMeshCount = 5;

    // Which static mesh to place
    UPROPERTY()
    UStaticMesh MeshAsset;

    UFUNCTION(BlueprintOverride)
    void ConstructionScript()
    {
        Print(f"Spawning {SpawnMeshCount} meshes from construction script!");

        for (int i = 0; i < SpawnMeshCount; ++i)
        {
            // Construct a new static mesh on this actor
            UStaticMeshComponent MeshComp = UStaticMeshComponent::Create(this);
            // Set the mesh we wanted for it
            MeshComp.SetStaticMesh(MeshAsset);
        }
    }
}
```

### Getting All Actors or Components

To get all components of a particular type that are on an actor, use `Actor.GetComponentsByClass()` and pass in the array. This function takes a `?` parameter, and will determine which component type to look for by the type of array you pass in.

For example, to get all static meshes on an actor:

```angelscript
AActor Actor;

TArray<UStaticMeshComponent> StaticMeshComponents;
Actor.GetComponentsByClass(StaticMeshComponents);

for (UStaticMeshComponent MeshComp : StaticMeshComponents)
{
    Print(f"Static Mesh Component: {MeshComp.Name}");
}
```

Similarly, to get all actors of a particular type that are currently in the world, use the `GetAllActorsOfClass()` global function, and pass in an array of the type of actor you want:

```angelscript
// Find all niagara actors currently in the level
TArray<ANiagaraActor> NiagaraActors;
GetAllActorsOfClass(NiagaraActors);
```

### Override Components

Unreal provides a mechanism for overriding one of a parent actor class' default components to use a child component class instead of the one specified on the parent actor. In script, this can be accessed by using the `OverrideComponent` specifier:

```angelscript
class ABaseActor : AActor
{
    // This base actor specifies a root component that is just a scene component
    UPROPERTY(DefaultComponent, RootComponent)
    USceneComponent SceneRoot;
}

class AChildActor : ABaseActor
{
    /**
     * Because static meshes are a type of scene component,
     * we can use an override component to turn the base class' root
     * scene component into a static mesh.
     */
    UPROPERTY(OverrideComponent = SceneRoot)
    UStaticMeshComponent RootStaticMesh;
}
```

> **Note:** Override components are similar to using `ObjectInitializer.SetDefaultSubobjectClass()` in a C++ constructor.

## Function Libraries

Interacting with unreal from scripts often happens through function libraries. These are exposed to script as namespaces containing a set of related functions.

For example, to set a timer you can call `System::SetTimer()`:

```angelscript
class ATimerExample : AActor
{
    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // Execute this.OnTimerExecuted() after 2 seconds
        System::SetTimer(this, n"OnTimerExecuted", 2.0, bLooping = false);
    }

    UFUNCTION()
    private void OnTimerExecuted()
    {
        Print("Timer executed!");
    }
}
```

### Common Libraries

Clicking the library will bring you to the API documentation for them, listing the available functions:

- [Math::](/api/index.html#CClass:Math) - All standard math functionality
- [Gameplay::](/api/index.html#CClass:Gameplay) - Game functionality such as streaming, damage, player handling
- [System::](/api/index.html#CClass:System) - Engine functionality such as timers, traces, debug rendering
- [Niagara::](/api/index.html#CClass:Niagara) - Spawning and controlling particle systems
- [Widget::](/api/index.html#CClass:Widget) - UMG widget functionality

### Namespace Simplification

The functions for function libraries in script are automatically taken from blueprint function library classes in C++.

Before binding, the angelscript plugin simplifies the name of the class to make a shorter namespace. For example, the functions in the `System::` namespace are automatically sourced from the `UKismetSystemLibrary` class in C++.

Common prefixes and suffixes that get stripped automatically are:

- U...Statics
- U...Library
- U...FunctionLibrary
- UKismet...Library
- UKismet...FunctionLibrary
- UBlueprint...Library
- UBlueprint...FunctionLibrary

For some examples of how namespaces are simplified:

- `UNiagaraFunctionLibrary` becomes `Niagara::`
- `UWidgetBlueprintLibrary` becomes `Widget::`
- `UKismetSystemLibrary` becomes `System::`
- `UGameplayStatics` becomes `Gameplay::`

## Math Library

Because blueprint and C++ have fairly different ways of doing math code, we have decided to keep the `Math::` namespace in script closer to the C++ `FMath::` namespace in general.

Sticking closer to C++ math eases the transition for experienced programmers and lets code be ported between the two more easily.

This means that `UKismetMathLibrary` gets ignored for automatic binding.

## FName Literals

A lot of unreal systems use `FName` to efficiently pass around arbitrary names without having to copy and compare strings a lot. The name struct itself is just an index into a name table, and creating an `FName` from a string does a table lookup or inserts a new entry into the table.

A common pattern in C++ is to declare a global/static variable for an `FName` constant to use, so that the name table lookup only happens once at startup.

In angelscript, this pattern is simplified by using name literals. Any string that is declared as `n"NameLiteral"` will be initialized at angelscript compile time, removing the nametable lookup from runtime.

Name literals have many uses. An example of using a name literal to bind a delegate to a `UFUNCTION()` in angelscript:

```angelscript
delegate void FExampleDelegate();

class ANameLiteralActor : AActor
{
    TMap<FName, int> ValuesByName;

    void UseNameLiteral()
    {
        FName NameVariable = n"MyName";
        ValuesByName.Add(NameVariable, 1);

        FExampleDelegate Delegate;
        Delegate.BindUFunction(this, n"FunctionBoundToDelegate");
        Delegate.ExecuteIfBound();

        // Due to the name literal, no string manipulation happens
        // in calls to UseNameLiteral() during runtime.
    }

    UFUNCTION()
    void FunctionBoundToDelegate()
    {
        Print("Delegate executed");
    }
}
```

## Formatted Strings

Scripts have support for writing formatted string literals in order to place the value of variables or expressions within a string. This can be especially useful for logging or debugging.

The syntax and format specifiers are heavily inspired by [Python's f-string feature](https://peps.python.org/pep-0498/).

Formatted strings are declared with the prefix `f""`, and expression values to interpolate are contained within `{}`. Curly braces inside formatted strings can be escaped by doubling up. That is, `f"{{"` is equivalent to `"{"`.

An example of some of the usages:

```angelscript
// Format Strings begin with f" and can hold expressions
// inside braces to replace within the string.
Print(f"Called from actor {GetName()} at location {ActorLocation}");

// Adding a = at the end of the expression will print the expression first
// For example:
Print(f"{DeltaSeconds =}");
// This prints:
//   DeltaSeconds = 0.01

// Format specifiers can be added following similar syntax to python's f-strings:
Print(f"Three Decimals: {ActorLocation.Z :.3}"); // Format float at three decimals of precision

Print(f"Extended to 10 digits with leading zeroes: {400 :010d}"); // 0000000400
Print(f"Hexadecimal: {20 :#x}"); // 0x14
Print(f"Binary: {1574 :b}"); // 11000100110
Print(f"Binary 32 Bits: {1574 :#032b}"); // 0b00000000000000000000011000100110

// Alignment works too
Print(f"Aligned: {GetName() :>40}"); // Adds spaces to the start of GetName() so it is 40 characters
Print(f"Aligned: {GetName() :_<40}"); // Adds underscores to the end of GetName() so it is 40 characters

// You can combine the equals with a format specifier
Print(f"{DeltaSeconds =:.0}");
// This prints:
//   DeltaSeconds = 0

// Enums by default print a full debug string
Print(f"{ESlateVisibility::Collapsed}"); // "ESlateVisibility::Collapsed (1)"
// But the 'n' specifier prints only the name of the value:
Print(f"{ESlateVisibility::Collapsed :n}"); // "Collapsed"
```

## Structs

Classes declared in script are always types of `UObject`, and are part of unreal's normal object system and garbage collector.

You can also make structs in script, which behave as value types:

```angelscript
struct FExampleStruct
{
    /* Properties with UPROPERTY() in a struct will be accessible in blueprint. */
    UPROPERTY()
    float ExampleNumber = 4.0;

    UPROPERTY()
    FString ExampleString = "Example String";

    /* Properties without UPROPERTY() will still be in the struct, but cannot be seen by blueprint. */
    float ExampleHiddenNumber = 3.0;
};
```

> **Note:** Unlike classes, structs cannot have `UFUNCTION()`s. They *can* have plain script methods on them however, although they will not be usable from blueprint.

### Passing and Returning Structs

Structs can be passed and returned from script functions and `UFUNCTION`s as normal:

```angelscript
UFUNCTION()
FExampleStruct CreateExampleStruct(float Number)
{
    FExampleStruct ResultStruct;
    ResultStruct.ExampleNumber = Number;
    ResultStruct.ExampleString = f"{Number}";

    return ResultStruct;
}

UFUNCTION(BlueprintPure)
bool IsNumberInStructEqual(FExampleStruct Struct, float TestNumber)
{
    return Struct.ExampleNumber == TestNumber;
}
```

### Struct References

By default, argument values in script functions are read-only. That means properties of a struct parameter cannot be changed, and non-const methods cannot be called on it.

If needed, you can take a reference to a struct to modify it:

```angelscript
// Change the parameter struct so its number is randomized between 0.0 and 1.0
UFUNCTION()
void RandomizeNumberInStruct(FExampleStruct& Struct)
{
    Struct.ExampleNumber = Math::RandRange(0.0, 1.0);
}
```

### Declaring Out Parameters

When a function with a struct reference is called from a blueprint node, the struct will be passed as an input value:

![](/img/struct-input.png)

When you want a struct parameter to be an ouput value only, declare the reference as `&out` in script. This works to create output pins for primitives as well:

```angelscript
UFUNCTION()
void OutputRandomizedStruct(FExampleStruct&out OutputStruct, bool&out bOutSuccessful)
{
    FExampleStruct ResultStruct;
    ResultStruct.ExampleNumber = Math::RandRange(0.0, 1.0);

    OutputStruct = ResultStruct;
    bOutSuccessful = true;
}
```

![](/img/struct-multioutput.png)

### Automatic References for Function Parameters

As an implementation detail: script functions never take struct parameters by value.
When you declare a struct parameter, it is internally implemented as a const reference, as if you added `const &`.

This means there is no difference between an `FVector` parameter and a `const FVector&` parameter. Both behave exactly the same in performance and semantics.

This choice was made to improve script performance and avoid having to instruct gameplay scripters to write `const &` on all their parameters.

## Unreal Networking Features

Unreal networking features are supported to a similar extent as they are in blueprint.

`UFUNCTION()`s can be marked as `NetMulticast`, `Client`, `Server` and/or `BlueprintAuthorityOnly` in their specifiers, functioning much the same as they do in C++. The function body will automatically be used as an RPC, whether calling it from angelscript or blueprint.

Unlike C++, angelscript RPC functions default to being reliable. If you want an unreliable RPC message, put the `Unreliable` specifier in the `UFUNCTION()` declaration.

`UPROPERTY()`s can be marked as `Replicated`. Optionally, you can set a condition for their replication as well, similar to the dropdown for blueprint properties. This can be done with the `ReplicationCondition` specifier.

Similar to C++ and Blueprint networking, in order for RPCs and replicated properties to work, the actor and component need to be set to replicate. In angelscript this can be done using `default` statements.

Example:

```angelscript
class AReplicatedActor : AActor
{
    // Set the actor's replicates property to default to true,
    // so its declared replicated properties work.
    default bReplicates = true;

    // Will always be replicated when it changes
    UPROPERTY(Replicated)
    bool bReplicatedBool = true;

    // Only replicates to the owner
    UPROPERTY(Replicated, ReplicationCondition = OwnerOnly)
    int ReplicatedInt = 0;

    // Calls OnRep_ReplicatedValue whenever it is replicated
    UPROPERTY(Replicated, ReplicatedUsing = OnRep_ReplicatedValue)
    int ReplicatedValue = 0;

    UFUNCTION()
    void OnRep_ReplicatedValue()
    {
        Print("Replicated Value has changed!");
    }
}
```

Available conditions for `ReplicationCondition` match the ELifetimeCondition enum in C++, and are as follows:

- None
- InitialOnly
- OwnerOnly
- SkipOwner
- SimulatedOnly
- AutonomousOnly
- SimulatedOrPhysics
- InitialOrOwner
- Custom
- ReplayOrOwner
- ReplayOnly
- SimulatedOnlyNoReplay
- SimulatedOrPhysicsNoReplay
- SkipReplay

It is also possible to specify `ReplicatedUsing` on a replicated `UPROPERTY` that will be called whenever the value of that property is replicated. Note that any function used with `ReplicatedUsing` must be declared as a `UFUNCTION()` so it is visible to unreal.

## Delegates

You must first declare a delegate type to indicate what parameters and return value your delegate wants.
In global scope:

```angelscript
// Declare a new delegate type with this function signature
delegate void FExampleDelegate(UObject Object, float Value);
```

From there, you can pass around values of your delegate type, bind them, and execute them:

```angelscript
class ADelegateExample : AActor
{
    FExampleDelegate StoredDelegate;

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // Bind the delegate so executing it calls this.OnDelegateExecuted()
        StoredDelegate.BindUFunction(this, n"OnDelegateExecuted");

        // You can also create new bound delegates by using the constructor:
        StoredDelegate = FExampleDelegateSignature(this, n"OnDelegateExecuted");
    }

    UFUNCTION()
    private void OnDelegateExecuted(UObject Object, float Value)
    {
        Print(f"Delegate was executed with object {Object} and value {Value}");
    }

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaSeconds)
    {
        // If the delegate is bound, execute it
        StoredDelegate.ExecuteIfBound(this, DeltaSeconds);
    }
}
```

> **Note:** A `delegate` declaration is equivalent to a `DECLARE_DYNAMIC_DELEGATE()` macro in C++. Functions bound to delegates are required to be declared as `UFUNCTION()`.

## Events

Events are similar to delegates, but can have multiple functions added to them, rather than always being bound to only one function.

Declare events with the `event` keyword in global scope, then use `AddUFunction()` and `Broadcast()`:

```angelscript
event void FExampleEvent(int Counter);

class AEventExample : AActor
{
    UPROPERTY()
    FExampleEvent OnExampleEvent;

    private int CallCounter = 0;

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // Add two functions to be called when the event is broadcast
        OnExampleEvent.AddUFunction(this, n"FirstHandler");
        OnExampleEvent.AddUFunction(this, n"SecondHandler");
    }

    UFUNCTION()
    private void FirstHandler(int Counter)
    {
        Print("Called first handler");
    }

    UFUNCTION()
    private void SecondHandler(int Counter)
    {
        Print("Called second handler");
    }

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaSeconds)
    {
        CallCounter += 1;
        OnExampleEvent.Broadcast(CallCounter);
    }
}
```

> **Note:** An `event` declaration is equivalent to a `DECLARE_DYNAMIC_MULTICAST_DELEGATE()` macro in C++. Functions added to events are required to be declared as `UFUNCTION()`.

### Events in Blueprint

By declaring `OnExampleEvent` as a `UPROPERTY()` in the previous example, we allow it to be accessed from blueprint. For events this means it will appear in the `Event Dispatchers` list for actors in the level, and we can bind it from the level blueprint:

![](/img/bp-event-dispatcher.png)

### Tip: Automatic signature generation in Visual Studio Code

If you bind a delegate or add a function to an event, and the function does not exist yet, the visual studio code extension will try to offer to create it for you.

Click the lightbulb icon or press Ctrl + ., and select the `Generate Method` option from the code actions dropdown:

![](/img/generate-method.png)

## Mixin Methods

It's possible in script to declare a method on a type outside the class body. This can be useful either to add methods to types from C++, or to separate out functionality from different systems.

To do this, declare a global function with the `mixin` keyword. The first parameter of the mixin function is filled with the object it is called on.

```angelscript
// Mixin method that teleports any actor
// The first, 'Self' parameter gets set to the actor it is called on
mixin void ExampleMixinTeleportActor(AActor Self, FVector Location)
{
    Self.ActorLocation = Location;
}

void Example_MixinMethod()
{
    // Call the mixin method on an actor
    // Note how ActorReference is passed into Self automatically
    AActor ActorReference;
    ActorReference.ExampleMixinTeleportActor(FVector(0.0, 0.0, 100.0));
}
```

When creating mixins for structs, you can take a reference to the struct as the first parameter. This allows changes to be made to it:

```angelscript
mixin void SetVectorToZero(FVector& Vector)
{
    Vector = FVector(0, 0, 0);
}

void Example_StructMixin()
{
    FVector LocalValue;
    LocalValue.SetVectorToZero();
}
```

> **Note:** It is also possible to create mixin functions from C++ with bindings.
>  See [Script Mixin Libraries](/cpp-bindings/mixin-libraries) for details.

## Gameplay Tags

Gameplay Tags are used in many unreal systems. See the [Unreal Documentation on Gameplay Tags](https://docs.unrealengine.com/5.1/en-US/using-gameplay-tags-in-unreal-engine/) for more details.

All `FGameplayTag` will automatically be bound to the global namespace `GameplayTags`. All non-alphanumeric characters, including the dot separators, are turned into underscore `_`.

```angelscript
// Assuming there is a GameplayTag named "UI.Action.Escape"
FGameplayTag TheTag = GameplayTags::UI_Action_Escape;
```

## Editor-Only Script

Some properties, functions, or classes from C++ are only available in the editor. If you try to use them in a cooked game, the script will fail to compile.

This could be things like actor labels, editor subsystems or visualizers, etc.

### Preprocessor Blocks

If you need to use editor-only code within a class, you can use the `#if EDITOR` preprocessor statement around the code. Any code within these blocks is not compiled outside of the editor, and can safely use editor-only functionality.

```angelscript
class AExampleActor : AActor
{
#if EDITOR
    default PivotOffset = FVector(0, 0, 10);
#endif

    UFUNCTION(BlueprintOverride)
    void ConstructionScript()
    {
#if EDITOR
        SetActorLabel("Example Actor Label");
#endif
    }
}
```

> **Tip:** Other useful macro conditions:
>  `EDITORONLY_DATA` - Whether properties that are only relevant to the editor are readable.
>  `RELEASE` - Whether the game is built in either the Shipping or Test build configurations.
>  `TEST` - Whether the game is built in Debug, Development, or Test build configurations.

### Editor-Only Directories

It is also possible for complete scipt files to be skipped outside of the editor. Any folder named `Editor` will be completely ignored by the script compiler in cooked builds. This can be useful to put for example editor visualizer or subsystem classes under an `Editor` folder.

In addition to the `Editor` folder, the two other folder names `Examples` and `Dev` are also ignored in cooked builds.

## Testing with Simulate-Cooked Mode

Because of editor-only scripts, it's possible to have scripts in your project that work and compile in the editor, but will fail once the game is cooked. To make it easier to detect these errors - for instance in a CI task - you can use the `-as-simulate-cooked` command line parameter.

When simulate cooked mode is active, editor-only properties and classes are not available in script, and `#if EDITOR` blocks are compiled out.

You can use this in combination with the `AngelscriptTest` commandlet to make sure everything compiles. An unreal command line to test whether the scripts compile might look like:

```sh
UnrealEditor-Cmd.exe "MyProject.uproject" -as-simulate-cooked -run=AngelscriptTest
```

## Subsystems

Subsystems are one of unreal's ways to collect common functionality into easily accessible singletons. See the [Unreal Documentation on Programming Subsystems](https://docs.unrealengine.com/5.1/en-US/programming-subsystems-in-unreal-engine/) for more details.

### Using a Subsystem

Subsystems in script can be retrieved by using `USubsystemClass::Get()`.

```angelscript
void TestCreateNewLevel()
{
    auto LevelEditorSubsystem = ULevelEditorSubsystem::Get();
    LevelEditorSubsystem.NewLevel("/Game/NewLevel");
}
```

> **Note:** Many subsystems are *Editor Subsystems* and cannot be used in packaged games.
>  Make sure you only use editor subsystems inside [Editor-Only Script](/scripting/editor-script/).

### Creating a Subsystem

To allow creating subsystems in script, helper base classes are available to inherit from that expose overridable functions.
These are:

- `UScriptWorldSubsystem` for world subsystems
- `UScriptGameInstanceSubsystem` for game instance subsystems
- `UScriptLocalPlayerSubsystem` for local player subsystems
- `UScriptEditorSubsystem` for editor subsystems
- `UScriptEngineSubsystem` for engine subsystems

For example, a scripted world subsystem might look like this:

```angelscript
class UMyGameWorldSubsystem : UScriptWorldSubsystem
{
    UFUNCTION(BlueprintOverride)
    void Initialize()
    {
        Print("MyGame World Subsystem Initialized!");
    }

    UFUNCTION(BlueprintOverride)
    void Tick(float DeltaTime)
    {
        Print("Tick");
    }

    // Create functions on the subsystem to expose functionality
    UFUNCTION()
    void LookAtMyActor(AActor Actor)
    {
    }
}

void UseMyGameWorldSubsystem()
{
    auto MySubsystem = UMyGameWorldSubsystem::Get();
    MySubsystem.LookAtMyActor(nullptr);
}
```

Any `UFUNCTION`s you've declared can also be accessed from blueprint on your subsystem:

![](/img/scripted-subsystem.png)

### Local Player Subsystems

In case of local player subsystems, you need to pass which `ULocalPlayer` to retrieve the subsystem for into the `::Get()` function:

```angelscript
class UMyPlayerSubsystem : UScriptLocalPlayerSubsystem
{
}

void UseScriptedPlayerSubsystem()
{
    ULocalPlayer RelevantPlayer = Gameplay::GetPlayerController(0).LocalPlayer;
    auto MySubsystem = UMyPlayerSubsystem::Get(RelevantPlayer);
}
```

> **Note:** It is also possible to directly pass an `APlayerController` when retrieving a local player subsystem.

## Angelscript Test Support

Angelscript features a xUnit-style unit testing framework. There is also an integration test framework that can play back game scenarios and wait for some condition to occur. You can generate code coverage reports for test runs as well. `FName`

## Unit Tests

```angelscript
void Test_NameOfTheTestCase(FUnitTest& T)
{
    // Fails the test.
    T.AssertTrue(false);
    T.AssertEquals(1, 1 + 1);
    T.AssertNotNull(nullptr);
}
```

You can put test code in any Angelscript file, but by convention these are put in File_Test.as if your production code is in File.as.

### Running Unit Tests

Unit tests run on hot reload, so to run a test you just create a test like above, open the Unreal editor, and save the file. In Unreal, go Window > Developer Tools > Output Log and you will see lines like

```text
Angelscript: [RUN]    Some.Angelscript.Subdir.Test_LaunchesNukesWhenCodesAreEntered
...
Angelscript: [OK]     Some.Angelscript.Subdir.Test_LaunchesNukesWhenCodesAreEntered (0.2530 ms)
```

Furthermore, the tests show up under the category "Angelscript" in the Test Automation tool. You will need to install that one into Unreal. See [https://docs.unrealengine.com/en-US/Programming/Automation/UserGuide/index.html](https://docs.unrealengine.com/en-US/Programming/Automation/UserGuide/index.html)

You can also run tests from the command line:

```text
Engine\Binaries\Win64\UE4Editor-Cmd.exe \Path\To\your.uproject -NullRHI -NoSound -NoSplash -ExecCmds="Automation RunTests Angelscript.UnitTests" -TestExit "Automation Test Queue Empty+Found 0 Automation Tests, based on" -unattended -stdout -as-exit-on-error
```

### Installing a Custom Game Mode for Unit Tests

You can add this line to one of your .ini files in your project to get a game mode in your tests: You can then create a blueprint at the specified location and put whatever settings you want in there. This will be used by all unit tests.

```ini
[/Script/EngineSettings.GameMapsSettings]
...
+GameModeClassAliases=(Name="UnitTest",GameMode="/Game/Testing/UnitTest/BP_UnitTestGameMode.BP_UnitTestGameMode_C")
```

## Integration Tests

Integration tests are for testing larger or longer code-flows and gameplay.

By default, each integration test has a map where you can draw up any geometry or place any actors you like.

Add this to for instance MyTestName_IntegrationTest.as:

```angelscript
void IntegrationTest_MyTestName(FIntegrationTest& T)
{   
}
```

Then you need to add a test map IntegrationTest_MyTestName.umap to /Content/Testing/ (create the dir if you don't have it in your project yet). The map name is always the same as the test name, with .umap added.

You can also configure the integration test map dir with this setting in your .ini files:

```ini
[/Script/AngelscriptCode.AngelscriptTestSettings]
IntegrationTestMapRoot=/Game/Testing/
```

If you would like to use a different map for an integration test, or the same map for multiple tests (e.g. testing in your existing level .umap files), create a second function with the format `FString IntegrationTest_MyTestName_GetMapName()` and return the full path to the map. This is something like `/Game/YourProject/YourMap`. You can right click the map and copy the reference to see it.

```angelscript
FString IntegrationTest_MyTestName_GetMapName()
{
    return "/Game/YourProject/Maps/YourMap";
}
```

Note: changing levels isn't supported at the moment, it breaks the GameWorld context passed to the FAngelscriptContext that the angelscript code is being executed within.

You can retrieve placed actors like this (or spawn them in the test):

```angelscript
// Looks up an actor in the map
AActor GetActorByLabel(UClass Class, const FName& Label)
{
#if EDITOR
    TArray<AActor> Actors;
    GetAllActorsOfClass(Class, Actors);

    for (AActor Actor: Actors)
    {
        if (Actor.GetActorLabel() == Label)
        {
            return Actor;
        }
    }

    FString AllActorLabels = "";
    for (AActor Actor: Actors)
    {
        AllActorLabels += "- " + Actor.GetActorLabel() + "\n";
    }

    if (AllActorLabels.IsEmpty())
    {
        Throw(
            "Did not find an actor with class " + Class.GetName() +
            " and label " + Label + ". In fact, there no actors in this level.");
    }
    else
    {
        Throw(
            "Did not find an actor with class " + Class.GetName() +
            " and label " + Label + ". Found these actors:\n" + AllActorLabels);
    }
#endif  // EDITOR

    Throw("GetActorByLabel is only for testing, i.e. when in EDITOR mode.");
    return nullptr;
}
```

### Latent Automation Commands

The code in the test function executes before the map is loaded and before the first frame executes. The test is not complete when the test function returns therefore, it has merely enqueued a series of *latent automation commands* ([Unreal documentation](https://docs.unrealengine.com/en-US/Programming/Automation/TechnicalGuide/index.html)). If we assume the test enqueues no latent commands of its own (like the one above), the test framework will enqueue the following actions (see IntegrationTest.cpp):

- FWaitForMapToLoadCommand()
- FEnsureWorldLoaded()
- FExitGameCommand()
- FReportFinished()
- FFreeTest()

These execute in sequence. Each action can take multiple engine frames to execute.

The test can enqueue latent commands of its own:

```angelscript
void IntegrationTest_AlienShootsRepeatedly(FIntegrationTest& T)
{ 
    AActor A = GetActorByLabel(ABulletSponge::StaticClass(), n"BulletSponge");
    ABulletSponge Floor = Cast<ABulletSponge>(A);

    T.AddLatentAutomationCommand(UGetsShotXTimes(Floor, 2));
}
```

The action is enqueued using `T.AddLatentAutomationCommand`. The set of latent actions will now be:

- ...
- FEnsureWorldLoaded()
- UGetsShowXTimes()
- FExitGameCommand()
- ...

AddLatentAutomationCommand takes a `ULatentAutomationCommand`:

```angelscript
UCLASS()
class ABulletSponge : AStaticMeshActor
{
    int NumTimesHit = 0;

    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        OnTakeAnyDamage.AddUFunction(this, n"TakeAnyDamage");
    }

    UFUNCTION()
    private void TakeAnyDamage(AActor DamagedActor, float32 Damage, const UDamageType DamageType, AController InstigatedBy, AActor DamageCauser)
    {
        NumTimesHit++;
    }
}

class UGetsShotXTimes : ULatentAutomationCommand
{
    private ABulletSponge BulletSponge;
    private int ExpectedNumHits;

    UGetsShotXTimes(ABulletSponge Target, int X)
    {
        BulletSponge = Target;
        ExpectedNumHits = X;
    }

    UFUNCTION(BlueprintOverride)
    bool Update()
    {
        // Note: actors can get DestroyActor'd at any time, so fail nicely if that happens!
        ensure(IsValid(BulletSponge));
        return BulletSponge.NumTimesHit > ExpectedNumHits;
    }

    UFUNCTION(BlueprintOverride)
    FString Describe() const
    {
        return BulletSponge.GetPathName() + ": bullet sponge got hit " + BulletSponge.NumTimesHit + "/" + ExpectedNumHits;
    }
}
```

The game engine will keep ticking as long as Update returns false. This means you can wait on any condition you can think of. The default timeout is five seconds though, so you can't wait for too long.

You can specify `default bAllowTimeout = true` on a latent command to allow it to time out. This is useful if you want to test that something is *not* happening (e.g. check actor doesn't move out of bounds during 5 seconds).

### Client/Server vs Standalone

The default behaviour is to run the integration tests in a client/dedicated-server model. This will break some assumptions and code that singleplayer games use. To run it in standalone mode instead, disable `Project Settings -> Angelscript Test Settings -> Use Client Server Model`.

### Running Integration Tests

Integration tests don't run on hot reload like unit tests, so you need to invoke them through the Test Automation window in Unreal. They are run just like unit tests, see above.

To run integration tests from the command line, run the same line as for unit tests but replace Angelscript.UnitTests with Angelscript.IntegrationTests.

### Complex Integration Tests

You can also generate test cases dynamically:

```angelscript
void ComplexIntegrationTest_PotionsAreTooStrongForKnight_GetTests(TArray<FString>& OutTestCommands)
{
     for (APotion Potion: MyGame::GetPotionRegistry().GetAllPotions())
     {
         OutTestCommands.Add(Potion.GetName().ToString());
     }
}

void ComplexIntegrationTest_PotionsAreTooStrongForKnight(FIntegrationTest& T)
{
    FString PotionName = T.GetParam();
    APotion Potion = MyGame::GetPotionRegistry().LookupPotion(PotionName);
    AKnight Knight = Cast<AKnight>(GetActorByLabel(AKnight::StaticClass(), n"Knight"));
    AActor PotionSeller = GetActorByLabel(AActor::StaticClass(), n"PotionSeller");

    // Order the knight to walk over to the potion seller and try to buy a potion.
    Knight.BuyPotionFrom(PotionSeller, Potion);
    T.AddLatentAutomationCommand(UExpectResponse("My potions are too strong for you traveller.", Knight, PotionSeller));
}
```

If we assume you have three potions in your potion registry, this generates three test cases:

```text
Angelscript.IntegrationTest.Your.Path.ComplexIntegrationTest_PotionsAreTooStrongForKnight[DA_Potion1]
Angelscript.IntegrationTest.Your.Path.ComplexIntegrationTest_PotionsAreTooStrongForKnight[DA_Potion2]
Angelscript.IntegrationTest.Your.Path.ComplexIntegrationTest_PotionsAreTooStrongForKnight[DA_Potion3]
```

### A Full Example

An example of an integration test to test that saves are backwards compatible (via upgrades/migrations). Assume that we changed the protected variable that `ExampleGameMode::GetCash()` uses between v1 and v2, and we want to ensure that our upgrade code successfully copies it from the old variable to the new.

```angelscript
/**
 * This could be in a file called Testing/UpgradeSaveGame_IntegrationTest.as,
 * or AnythingElse/DoesntMatter_IntegrationTest.as.
 *
 * Note that angelscript does a lot of lifting around turning the automation
 * framework into integration tests. See the code for more details.
 */

// Define the overall test. The naming standard is important. You run this from
// Session Frontend -> Automation Tab. Search for e.g. "V1" to show this function,
// then tick it to select it.
void IntegrationTest_UpgradeSaveGameV1(FIntegrationTest& T)
{
    // Queue the object that can run for more than one frame,
    // to validate a long-running test
    T.AddLatentAutomationCommand(UTestUpgradeSaveGameV1());
}

// A function that returns an FString, with the same name as the integration test
// + a _GetMapName() suffix allows us to override the default behaviour of
// requiring a map name matching the test name.
FString IntegrationTest_UpgradeSaveGameV1_GetMapName()
{
    return "/Game/IS/Maps/ISMainMap";
}

// Bulk of the work is here. You can have multiple of these.
class UTestUpgradeSaveGameV1 : ULatentAutomationCommand
{
    // The sentinel value we expect to see in the loaded save. In the v1 save
    // this is stored in ExampleGameMode::Cash. In the v2 save,
    // ExampleGameMode::GetCash() should retrieve this from the new CashTest
    // variable. Different to what CashTest defaults to.
    float CashFromV1Save = 12345.0;

    // Manually create a save in the previous version to use in the test here.
    FString V1SaveFileName = "IntegrationTest_UpgradeSaveGameV1";

    // This runs at the start of this command's lifetime in the test.
    // GetWorld(), and therefore all the automatic context places it's used,
    // should be valid here (unless you try changing the map).
    UFUNCTION(BlueprintOverride)
    void Before()
    {
        auto GM = ExampleGameMode::Get();
        auto ExampleSaveSystem = UExampleSaveSystem::Get();
        ExampleSaveSystem.SelectSaveFile(V1SaveFileName);

        // Can't change the map in an integration test, so don't do a full
        // map reload. Just deserialize.
        ExampleSaveSystem.LoadWithoutReload(V1SaveFileName);
    }

    // Runs each tick. Return true to pass the test. The test fails if the
    // timeout (default 5 seconds) is hit and this hasn't returned true.
    UFUNCTION(BlueprintOverride)
    bool Update()
    {
        auto GM = ExampleGameMode::Get();

        // If the gamemode is loaded from the save, and the upgrade code has
        // run successfully, the values should match.
        if (GM != nullptr && Math::IsNearlyEqual(CashFromV1Save, GM.GetCash()))
        {
            return true;
        }
        return false;
    }

    // The output in the automation test log. Show expected success condition
    // and current state for debugging when it fails. Important to check
    // GetWorld() in case it runs too early.
    UFUNCTION(BlueprintOverride)
    FString Describe() const
    {
        float ActualCash = -1.0;
        if (GetWorld() != nullptr)
        {
            auto GM = ExampleGameMode::Get();
            if (GM != nullptr)
            {
                ActualCash = GM.GetCash();
            }
        }
        return f"Expected cash: {CashFromV1Save}, Actual cash: {ActualCash} (-1 is null)";
    }
}
```

## Code Coverage

Enable code coverage in Project Settings > Editor > Angelscript Test settings (or pass -as-enable-code-coverage on the command line). Note, code coverage slows down editor startup by ~20 seconds so remember to turn it off later.

![CoverageToggle](/img/coverage-toggle.png)

Run some tests as described above. The editor will write a report to Saved/CodeCoverage. Note: it's overwritten each time you start a new test run.

![CoverageDir](/img/coverage-dir.png)

Open index.html to see a summary for all your angelscript.

![CoverageIndex](/img/coverage-index.png)

Open individual files to see their line coverage.

![CoverageDir](/img/coverage-file.png)
