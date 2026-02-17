# Angelscript Language Reference

Language fundamentals, type system, and C++ binding reference for Unreal Engine Angelscript.

Source: [angelscript.hazelight.se](http://angelscript.hazelight.se/)

## Language Fundamentals

Angelscript for Unreal Engine is a statically-typed scripting language with syntax very similar to C++. This section covers the core language features, types, and patterns used in UE Angelscript.

### Basic Types

Angelscript provides the following primitive types:

| Type | Description | Example |
|------|-------------|---------|
| `bool` | Boolean value | `bool bActive = true;` |
| `int` | 32-bit signed integer | `int Count = 42;` |
| `int8` | 8-bit signed integer | `int8 Small = -1;` |
| `int16` | 16-bit signed integer | `int16 Medium = 100;` |
| `int32` | 32-bit signed integer (same as int) | `int32 Value = 0;` |
| `int64` | 64-bit signed integer | `int64 BigNum = 9999999999;` |
| `uint` | 32-bit unsigned integer | `uint Index = 0;` |
| `uint8` | 8-bit unsigned integer (byte) | `uint8 Byte = 255;` |
| `uint16` | 16-bit unsigned integer | `uint16 Port = 8080;` |
| `uint32` | 32-bit unsigned integer | `uint32 Flags = 0;` |
| `uint64` | 64-bit unsigned integer | `uint64 Handle = 0;` |
| `float` | 32-bit floating point | `float Speed = 100.0;` |
| `float32` | 32-bit floating point (same as float) | `float32 X = 1.0;` |
| `double` / `float64` | 64-bit floating point | `double Precise = 3.14159265;` |

### String Types

Unreal Engine Angelscript uses UE string types directly:

```angelscript
// FString - mutable string, most common for general use
FString MyString = "Hello World";

// FName - immutable, case-insensitive, optimized for comparisons (hashed)
// Use the n"" literal syntax for compile-time FName creation
FName MyName = n"SomeName";

// FText - localized text, used for UI display
FText MyText = FText::FromString("Displayed Text");

// String operations
FString Combined = MyString + " More Text";
int Length = MyString.Len();
bool bContains = MyString.Contains("Hello");
FString Upper = MyString.ToUpper();
```

### FName Literals

FName values can be created at compile time using the `n""` literal syntax:

```angelscript
// Compile-time FName literal
FName Tag = n"MyTag";
FName Socket = n"SocketName";

// Used commonly in function calls
Actor.Tags.Add(n"Enemy");
Mesh.AttachToComponent(Root, n"SocketName");

// FName comparison is case-insensitive and very fast (hash-based)
if (Name == n"Expected")
    DoSomething();
```

### Format Strings

Angelscript supports f-string syntax for string interpolation:

```angelscript
int Count = 5;
float Health = 75.5;
FString Name = "Player";

// Basic interpolation with f"" prefix
FString Message = f"Hello {Name}, you have {Count} items";

// Expressions are evaluated inside braces
FString Status = f"Health: {Health / 100.0 * 100}%";

// Works with any type that has a string conversion
AActor Actor = GetOwner();
Print(f"Actor: {Actor}, Location: {Actor.ActorLocation}");
```

### Container Types

UE container types are available in Angelscript:

```angelscript
// TArray - dynamic array
TArray<int> Numbers;
Numbers.Add(1);
Numbers.Add(2);
Numbers.Add(3);
int First = Numbers[0];
int Count = Numbers.Num();

for (int Num : Numbers)
    Print(f"{Num}");

// Adding and removing
Numbers.AddUnique(2);       // Won't add duplicate
Numbers.Remove(1);          // Remove first occurrence
Numbers.RemoveAt(0);        // Remove by index
Numbers.Empty();            // Clear all

// TMap - key-value dictionary
TMap<FName, int> ScoreMap;
ScoreMap.Add(n"Player1", 100);
ScoreMap.Add(n"Player2", 200);
int Score = ScoreMap[n"Player1"];
bool bHas = ScoreMap.Contains(n"Player1");

for (auto Pair : ScoreMap)
    Print(f"{Pair.Key}: {Pair.Value}");

// TSet - unique value collection
TSet<FName> TagSet;
TagSet.Add(n"Enemy");
TagSet.Add(n"Boss");
bool bIsEnemy = TagSet.Contains(n"Enemy");
```

### Handle Types (UObject References)

All UObject-derived types are handle types (reference-counted pointers). They use value syntax but behave like pointers:

```angelscript
// UObject handles are nullable
AActor MyActor;                      // Default: nullptr
UStaticMeshComponent Mesh;           // Default: nullptr

// Null checks
if (MyActor != nullptr)
    MyActor.Destroy();

// Validity check (preferred - also checks pending kill)
if (System::IsValid(MyActor))
    MyActor.Destroy();

// Assignment copies the reference, not the object
AActor OtherRef = MyActor;           // Both point to same actor
```

### Casting

Use `Cast<T>` to cast between UObject types (equivalent to C++ Cast):

```angelscript
// Cast returns nullptr if the cast fails
AActor SomeActor = GetOwner();
ACharacter Character = Cast<ACharacter>(SomeActor);
if (Character != nullptr)
{
    Character.Jump();
}

// One-liner pattern
if (auto Pawn = Cast<APawn>(SomeActor))
{
    Pawn.GetController();
}

// For component retrieval
auto Mesh = Cast<UStaticMeshComponent>(Actor.GetComponentByClass(UStaticMeshComponent::StaticClass()));
```

### The auto Keyword

The `auto` keyword can be used for type inference:

```angelscript
// auto deduces the type from the right-hand side
auto Location = Actor.GetActorLocation();  // FVector
auto Name = Actor.GetName();               // FString
auto Comp = Actor.RootComponent;           // USceneComponent

// Useful with Cast
if (auto Character = Cast<ACharacter>(Actor))
{
    // Character is ACharacter type here
}

// In for loops
for (auto Component : Actor.GetComponents())
{
    Print(f"{Component.GetName()}");
}
```

### Lambda Expressions

Angelscript supports lambda expressions for inline function definitions:

```angelscript
// Lambda with capture
auto MyLambda = [this]() {
    Print("Lambda called!");
};
MyLambda();

// Lambda with parameters
auto Add = [](int A, int B) -> int {
    return A + B;
};
int Result = Add(3, 4);

// Lambdas with timers
System::SetTimer(this, n"", 2.0, false,
    FTimerDelegate([this]() {
        Print("Timer fired!");
    })
);

// Used in array operations
TArray<int> Numbers = {3, 1, 4, 1, 5};
Numbers.Sort([](int A, int B) -> bool {
    return A < B;
});
```

### Structs

Structs are value types (copied on assignment, passed by value unless using `const&` or `&out`):

```angelscript
// Using built-in UE structs
FVector Location = FVector(100.0, 200.0, 0.0);
FRotator Rotation = FRotator(0.0, 90.0, 0.0);
FTransform Transform = FTransform(Rotation, Location);
FLinearColor Color = FLinearColor::Red;
FVector2D ScreenPos = FVector2D(0.5, 0.5);

// Declaring custom structs
struct FMyData
{
    UPROPERTY()
    int Value = 0;

    UPROPERTY()
    FString Name = "";

    void Reset()
    {
        Value = 0;
        Name = "";
    }
};

// Struct usage
FMyData Data;
Data.Value = 42;
Data.Name = "Test";
```

### Enums

```angelscript
// Using UE enums
ECollisionChannel Channel = ECollisionChannel::ECC_Pawn;
EMovementMode Mode = EMovementMode::MOVE_Walking;

// Declaring custom enums
enum EMyState
{
    Idle,
    Running,
    Jumping,
    MAX
};

EMyState CurrentState = EMyState::Idle;
```

### Control Flow

Standard C++ control flow structures work in Angelscript:

```angelscript
// if/else
if (bCondition)
    DoA();
else if (bOther)
    DoB();
else
    DoC();

// for loop
for (int i = 0; i < 10; i++)
    Print(f"{i}");

// range-based for
for (AActor Actor : AllActors)
    Actor.Tick(0.0);

// while
while (bRunning)
{
    Step();
}

// switch
switch (State)
{
    case EMyState::Idle:
        HandleIdle();
        break;
    case EMyState::Running:
        HandleRunning();
        break;
    default:
        break;
}
```

### Class Declaration Patterns

```angelscript
// Actor class
class AMyActor : AActor
{
    // Default component declarations
    UPROPERTY(DefaultComponent, RootComponent)
    USceneComponent Root;

    UPROPERTY(DefaultComponent, Attach = Root)
    UStaticMeshComponent Mesh;

    // Exposed property
    UPROPERTY(EditAnywhere, Category = "Config")
    float Speed = 100.0;

    // Set defaults from parent class
    default bReplicates = true;
    default bGenerateOverlapEvents = true;

    // Blueprint-visible function
    UFUNCTION()
    void DoSomething() { }

    // Blueprint-overridable event
    UFUNCTION(BlueprintEvent)
    void OnSomethingHappened() { }

    // Override C++ event
    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        Super::BeginPlay();
    }

    // Pure script method (not visible to blueprint, hot-reloads faster)
    void InternalHelper() { }
}

// ActorComponent class
class UMyComponent : UActorComponent
{
    UPROPERTY()
    int Data = 0;

    UFUNCTION(BlueprintOverride)
    void BeginPlay() { }

    UFUNCTION(BlueprintOverride)
    void TickComponent(float DeltaTime) { }
}
```

### Access Modifiers

Angelscript supports access modifiers similar to C++:

```angelscript
class AMyActor : AActor
{
    // Public by default (accessible from anywhere)
    UPROPERTY()
    int PublicValue = 0;

    // Private (only accessible within this class)
    private int SecretValue = 0;

    // Protected (accessible from this class and subclasses)
    protected int InheritedValue = 0;

    // Functions can also be private/protected
    private void InternalMethod() { }
    protected void OverridableHelper() { }
}
```

### Namespaces

```angelscript
// Accessing static functions via namespace syntax
float Dist = FVector::Dist(A, B);
FRotator Rot = FRotator::MakeFromEuler(FVector(0, 0, 90));
float Clamped = FMath::Clamp(Value, 0.0, 1.0);

// UE subsystems and singletons
auto GameInstance = Gameplay::GetGameInstance();
auto World = Gameplay::GetWorld();
```

### Const References and Output Parameters

```angelscript
// const reference parameters (passed by reference, not copied)
void ProcessVector(const FVector& InVec)
{
    // Cannot modify InVec
    Print(f"Vector: {InVec}");
}

// Output parameters (caller receives modifications)
void GetValues(int& OutA, FString& OutB)
{
    OutA = 42;
    OutB = "Result";
}

// Calling with output parameters
int A;
FString B;
GetValues(A, B);
// A is now 42, B is now "Result"
```

### TSubclassOf and TSoftObjectPtr

```angelscript
// TSubclassOf - type-safe class reference
UPROPERTY(EditAnywhere)
TSubclassOf<AActor> ActorClass;

// Spawn from class reference
AActor Spawned = SpawnActor(ActorClass, SpawnLocation);

// TSoftObjectPtr - lazy asset reference
UPROPERTY(EditAnywhere)
TSoftObjectPtr<UStaticMesh> MeshAsset;

// Load when needed
UStaticMesh LoadedMesh = MeshAsset.Get();
```

### Preprocessor Directives

Angelscript uses preprocessor-like metadata directives:

```angelscript
// UCLASS metadata
#UCLASS(Config = Game)
class AMyConfigActor : AActor
{
    // UPROPERTY with metadata
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings",
        Meta = (ClampMin = 0, ClampMax = 100))
    float Percentage = 50.0;

    // UFUNCTION with metadata
    UFUNCTION(BlueprintCallable, Category = "Actions",
        Meta = (DisplayName = "Do Action"))
    void DoAction() { }
}
```

### Error Handling

Angelscript does not have try/catch exceptions. Instead, use validation patterns:

```angelscript
// Use ensure/check macros for assertions
void ProcessActor(AActor Actor)
{
    // ensure() logs an error but continues execution
    if (!ensure(Actor != nullptr))
        return;

    // Validity checks for UObjects
    if (!System::IsValid(Actor))
    {
        Print("Actor is not valid!");
        return;
    }

    // Cast can return nullptr - always check
    ACharacter Character = Cast<ACharacter>(Actor);
    if (Character == nullptr)
    {
        Print("Actor is not a character");
        return;
    }
}

// For tests, use Throw() to fail with an error message
void Test_SomeCondition(FUnitTest& T)
{
    if (!SomeCondition())
        Throw("Condition was not met!");
}
```

### Common Math Operations

Angelscript provides access to UE math utilities through `FMath` and related types:

```angelscript
// FMath functions
float Clamped = FMath::Clamp(Value, 0.0, 1.0);
float Lerped = FMath::Lerp(Start, End, Alpha);
float Abs = FMath::Abs(-5.0);
float Min = FMath::Min(A, B);
float Max = FMath::Max(A, B);
int RandInt = FMath::RandRange(0, 100);
float RandFloat = FMath::FRandRange(0.0, 1.0);
bool bNearlyEqual = FMath::IsNearlyEqual(A, B, 0.001);
float Interp = FMath::FInterpTo(Current, Target, DeltaTime, Speed);

// Vector operations
FVector A = FVector(1.0, 0.0, 0.0);
FVector B = FVector(0.0, 1.0, 0.0);
float Distance = FVector::Dist(A, B);
float DotProduct = A.DotProduct(B);
FVector CrossProduct = A.CrossProduct(B);
FVector Normalized = A.GetSafeNormal();
float Length = A.Size();

// Rotator operations
FRotator Rot = FRotator(0.0, 90.0, 0.0);  // Pitch, Yaw, Roll
FVector Forward = Rot.GetForwardVector();
FRotator Combined = FRotator::MakeFromEuler(FVector(0, 0, 90));
FRotator Interped = FMath::RInterpTo(CurrentRot, TargetRot, DeltaTime, Speed);
```

### Timers

Timer functionality is commonly used for delayed and repeated actions:

```angelscript
class ATimerExample : AActor
{
    UFUNCTION(BlueprintOverride)
    void BeginPlay()
    {
        // Call a function after a delay
        System::SetTimer(this, n"OnTimerFired", 2.0, false);

        // Call a function repeatedly
        System::SetTimer(this, n"OnRepeatingTimer", 1.0, true);
    }

    UFUNCTION()
    void OnTimerFired()
    {
        Print("Timer fired once after 2 seconds!");
    }

    UFUNCTION()
    void OnRepeatingTimer()
    {
        Print("This fires every second!");

        // Clear the timer when done
        System::ClearTimer(this, n"OnRepeatingTimer");
    }
}
```

### Logging and Debugging

```angelscript
// Print to screen (temporary debug message)
Print("Debug message");
Print(f"Value is {MyValue}");

// Print with duration
Print("Long message", 10.0);

// Log to output log
Log("This goes to the output log");
Warning("This is a warning");
Error("This is an error");

// Conditional debug drawing
System::DrawDebugLine(Start, End, FLinearColor::Red, 5.0);
System::DrawDebugSphere(Center, Radius, 12, FLinearColor::Green, 5.0);
System::DrawDebugBox(Center, Extent, FLinearColor::Blue, 5.0);
```

### Common UE Math Types Reference

| Type | Description | Common Usage |
|------|-------------|--------------|
| `FVector` | 3D vector (X, Y, Z) | Position, direction, velocity |
| `FVector2D` | 2D vector (X, Y) | Screen coordinates, UV |
| `FRotator` | Rotation (Pitch, Yaw, Roll) | Actor rotation, camera angles |
| `FQuat` | Quaternion rotation | Smooth interpolation, avoiding gimbal lock |
| `FTransform` | Position + Rotation + Scale | Complete spatial transform |
| `FLinearColor` | Color (R, G, B, A) as floats | Material colors, lighting |
| `FColor` | Color (R, G, B, A) as bytes | UI colors, vertex colors |
| `FBox` | Axis-aligned bounding box | Collision, spatial queries |
| `FPlane` | 3D plane | Clipping, intersection tests |
| `FMatrix` | 4x4 transformation matrix | Advanced transforms |

### Operator Overloading

Common UE types support standard operators:

```angelscript
// Vector math
FVector A = FVector(1, 2, 3);
FVector B = FVector(4, 5, 6);
FVector Sum = A + B;           // (5, 7, 9)
FVector Diff = A - B;          // (-3, -3, -3)
FVector Scaled = A * 2.0;     // (2, 4, 6)
FVector Div = B / 2.0;        // (2, 2.5, 3)
A += B;                        // A is now (5, 7, 9)

// Rotator math
FRotator R1 = FRotator(0, 90, 0);
FRotator R2 = FRotator(45, 0, 0);
FRotator Combined = R1 + R2;  // (45, 90, 0)

// String concatenation
FString S = "Hello" + " " + "World";
FString WithNum = "Count: " + 42;    // Implicit conversion

// Comparison operators work on most types
bool bEqual = (A == B);
bool bNotEqual = (A != B);
```

### Interface Implementation

Angelscript supports implementing UE interfaces:

```angelscript
// Implementing a C++ interface
class AMyInteractable : AActor, IInteractable
{
    // Implement the interface method
    UFUNCTION(BlueprintOverride)
    void Interact(AActor Caller)
    {
        Print(f"Interacted by {Caller}");
    }

    UFUNCTION(BlueprintOverride)
    bool CanInteract() const
    {
        return true;
    }
}

// Checking if an actor implements an interface
void TryInteract(AActor Actor)
{
    IInteractable Interactable = Cast<IInteractable>(Actor);
    if (Interactable != nullptr)
    {
        if (Interactable.CanInteract())
            Interactable.Interact(this);
    }
}
```

### Common Patterns

#### Null Coalescing and Conditional Access

```angelscript
// Null check pattern
AActor Owner = GetOwner();
if (Owner != nullptr)
{
    FVector Loc = Owner.GetActorLocation();
}

// Common pattern: early return on null
void DoSomethingWithOwner()
{
    AActor Owner = GetOwner();
    if (Owner == nullptr)
        return;

    // Safe to use Owner here
    Owner.SetActorLocation(FVector::ZeroVector);
}
```

#### Getting Components

```angelscript
// Get a component by type
UStaticMeshComponent Mesh = UStaticMeshComponent::Get(SomeActor);

// Get all components of a type
TArray<UStaticMeshComponent> AllMeshes;
GetComponentsByClass(AllMeshes);

// Create component at runtime
UStaticMeshComponent NewMesh = UStaticMeshComponent::Create(this);
NewMesh.AttachToComponent(RootComponent);
```

#### Working with the World

```angelscript
// Get all actors of a class
TArray<AActor> AllActors;
GetAllActorsOfClass(AllActors);

// More specific
TArray<AMyActor> MyActors;
GetAllActorsOfClass(MyActors);

// Line trace
FHitResult Hit;
bool bHit = System::LineTraceSingleByChannel(
    Start, End,
    ETraceTypeQuery::TraceTypeQuery1,
    false,  // bTraceComplex
    TArray<AActor>(),  // ActorsToIgnore
    EDrawDebugTrace::None,
    Hit,
    true  // bIgnoreSelf
);

if (bHit)
{
    Print(f"Hit: {Hit.Actor} at {Hit.Location}");
}
```

#### Asset References and Loading

```angelscript
// TSubclassOf for class references
UPROPERTY(EditAnywhere, Category = "Spawning")
TSubclassOf<AActor> ActorToSpawn;

// Spawn actor from class reference
void SpawnSomething()
{
    if (ActorToSpawn.IsValid())
    {
        FVector Location = GetActorLocation() + FVector(0, 0, 100);
        FRotator Rotation = FRotator::ZeroRotator;
        AActor Spawned = SpawnActor(ActorToSpawn, Location, Rotation);
    }
}

// Soft object references (lazy loading)
UPROPERTY(EditAnywhere, Category = "Assets")
TSoftObjectPtr<UStaticMesh> MeshAsset;

UPROPERTY(EditAnywhere, Category = "Assets")
TSoftClassPtr<AActor> ActorClassAsset;
```

### Hot Reload Behavior

One of the key features of Angelscript in Unreal is hot reload support:

- Script changes are detected automatically when files are saved.
- The editor recompiles and hot-reloads scripts without restarting.
- **Pure script methods** (not marked as `UFUNCTION`) reload faster than blueprint-exposed functions.
- **Property changes** require a more expensive reload that reconstructs objects.
- Use `default` statements instead of constructors to ensure correct behavior during hot reload.
- **Functions marked `UFUNCTION(BlueprintEvent)`** cause a full blueprint recompile on hot reload.

Best practices for fast iteration:
- Keep internal helper methods as plain script methods (no `UFUNCTION`).
- Only add `UFUNCTION()` when blueprint access is actually needed.
- Use `UPROPERTY()` only for properties that need editor/blueprint exposure.
- Organize code so that frequently changed logic is in script-only methods.


## Overview of Differences for C++ Unreal Developers

While the script files will feel familiar to developers used to working in C++ with Unreal, there are a number of differences. Most of the differences are intended to simplify the script language for people coming in from using Blueprint.

Some differences you will most likely run into are highlighted here.

### Objects Instead of Pointers

Any variable declared with a `UObject` type is automatically an object reference. Pointers do not exist in the script language. This is similar to how object reference variables work in blueprint. There is no `->` arrow operator in script, everything happens with `.` dots.

> **Note:** Unlike in C++, it is **not** necessary to declare a property as `UPROPERTY()` in order to avoid it being garbage collected. All object references in script are automatically inserted into the GC.

```angelscript
void TeleportActorToOtherActor(AActor ActorReference, AActor TeleportToActor)
{
    FTransform TeleportToTransform = TeleportToActor.GetActorTransform();
    ActorReference.SetActorTransform(TeleportToTransform);
}
```

### Default Accessibility for Properties

`UPROPERTY()` variables are `EditAnywhere` and `BlueprintReadWrite` by default. This can be overridden by specifying `NotBlueprintCallable` or `NotEditable`.

The default access specifiers for properties in script can be configured from Project Settings.

The intent of this is to simplify property specifiers. Since `UPROPERTY()` is not needed for correct garbage collection, you should only specify it when you want it to be accessible in the editor/blueprint.

### Default Callability for Functions

Functions declared with `UFUNCTION()` are `BlueprintCallable` by default, even when this is not specified explicitly. This is intended to simplify function declarations, as making a script function a `UFUNCTION()` is generally already an indicator of wanting it to be called from blueprint.

This behavior can be turned off from Project Settings, if you prefer requiring `BlueprintCallable` to be explicit.

### Use the `default` Keyword Instead of Constructors

Instead of using object constructors, which can run at unpredictable times during hot reloads, any default values for properties should be specified in the class body.

For setting values on subobjects, use the `default` keyword:

```angelscript
class AExampleActor : AActor
{
    // Set default values for class properties in the class body
    UPROPERTY()
    float ConfigurableValue = 5.0;

    // Set default values for subobjects with `default` statements
    UPROPERTY(DefaultComponent)
    UCapsuleComponent CapsuleComponent;
    default CapsuleComponent.CapsuleHalfHeight = 88.0;
    default CapsuleComponent.CapsuleRadius = 40.0;
    default CapsuleComponent.bGenerateOverlapEvents = true;
}
```

### Floating Point Width

With Unreal 5.0, Epic has started using `double`s for all gameplay-related vectors, rotators, etc. Rather than confuse people that are used to working with `float` in blueprint, they decided to keep calling these doubles `float` everywhere in the editor like before.

The angelscript integration follows this decision, meaning that when you declare a `float` in script, it is actually a 64-bit double value. To create a floating-point variable with a specific width, you can explicitly use the `float32` or `float64` types.

```angelscript
float ValueDouble = 1.0; // <-- This is a 64-bit double-precision float
float32 ValueSingle = 1.f; // <-- This is a 32-bit single-precision float
float64 ValueAlsoDouble = 1.0; // <-- This is *also* a 64-bit double-precision float
```

## Automatic Bindings

When the engine starts, the angelscript plugin automatically goes through all of unreal's reflection data.

Relevant types, properties and functions from C++ are automatically given bindings into Angelscript so they can be used from your scripts.

The general principle of automatic bindings is:
If it can be used from Blueprint, it should be usable from Angelscript.

### Class Bindings

Classes in C++ that are marked with `UCLASS()` are automatically bound either when they have the `BlueprintType` specifier, or if they contain any functions with `BlueprintCallable`.

For example, this C++ class:

```cpp
UCLASS(BlueprintType)
class UHealthComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Health")
    float MaxHealth = 100.f;

    UPROPERTY(BlueprintReadOnly, Category = "Health")
    float CurrentHealth;

    UFUNCTION(BlueprintCallable, Category = "Health")
    void TakeDamage(float Amount);

    UFUNCTION(BlueprintImplementableEvent)
    void OnDeath();
};
```

Becomes usable in Angelscript as:

```angelscript
// All BlueprintReadWrite/ReadOnly properties and BlueprintCallable functions
// are available automatically — no manual binding needed.
auto HealthComp = Player.GetComponentByClass(UHealthComponent::StaticClass());
HealthComp.MaxHealth = 200.f;           // BlueprintReadWrite -> read/write
float Hp = HealthComp.CurrentHealth;    // BlueprintReadOnly -> read only
HealthComp.TakeDamage(50.f);           // BlueprintCallable -> callable
```

Classes can be skipped for automatic bindings by adding the `NotInAngelscript` metadata:

```cpp
UCLASS(BlueprintType, meta = (NotInAngelscript))
class UInternalOnlyClass : public UObject { /* ... */ };
```

### Struct Bindings

Structs in C++ that are marked with `USTRUCT()` are automatically bound either when they have the `BlueprintType` specifier, or if they contain any properties that are blueprint-accessible or editable.

```cpp
USTRUCT(BlueprintType)
struct FDamageInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite)
    float Amount = 0.f;

    UPROPERTY(BlueprintReadWrite)
    AActor* Instigator = nullptr;

    UPROPERTY(BlueprintReadWrite)
    EDamageType Type = EDamageType::Physical;
};
```

```angelscript
// Structs are value types in Angelscript
FDamageInfo Info;
Info.Amount = 25.f;
Info.Instigator = Player;
Info.Type = EDamageType::Fire;
```

Structs can be skipped for automatic bindings by adding the `NoAutoAngelscriptBind` metadata.

### Property Bindings

#### Read/Write Flags

C++ `UPROPERTY`s that are declared with `BlueprintReadWrite` or `BlueprintReadOnly` are automatically bound to script.

If the property is `BlueprintReadOnly`, it will become `const` and unable to be changed from script.

To expose a property to Angelscript without exposing it to blueprint, you can use the `ScriptReadWrite` or `ScriptReadOnly` specifiers:

```cpp
// Visible to Angelscript but NOT to Blueprint
UPROPERTY(ScriptReadWrite)
int32 InternalCounter;

UPROPERTY(ScriptReadOnly)
FString CachedResult;
```

#### Editable Flags

Properties that are declared with any of the editable flags (`EditAnywhere`, `EditInstanceOnly` or `EditDefaultsOnly`) are also exposed to script.

> **Note:** If a property has an editable flag, but not a blueprint access flag, it will **only** be accessible in script from inside a class `default` statement. *See [Default Statements](/scripting/actors-components/#default-statements).*

```cpp
// EditAnywhere WITHOUT BlueprintReadWrite:
UPROPERTY(EditAnywhere, Category = "Config")
float SpawnRate = 1.f;
```

```angelscript
// Can only set via default statement, not in regular code:
class AMySpawner : AActor
{
    default SpawnRate = 2.5f;  // OK — default statement
    // SpawnRate = 3.f;        // ERROR — not accessible outside defaults
}
```

#### Skipping Properties

Properties can be skipped for angelscript binds even if they are otherwise accessible to blueprint by adding the `NotInAngelscript` metadata.

### Function Bindings

#### Callable Flags

Any C++ `UFUNCTION` that has `BlueprintCallable` or `BlueprintPure` is automatically bound to script.

To expose a function to Angelscript without exposing it to blueprint, you can use the `ScriptCallable` specifier:

```cpp
// Available in Angelscript but NOT in Blueprint graphs
UFUNCTION(ScriptCallable)
void DebugDumpState();
```

#### Blueprint Events

`UFUNCTION`s with the `BlueprintImplementableEvent` and `BlueprintNativeEvent` specifiers can be overridden from script using `BlueprintOverride`:

```cpp
// C++ declaration
UFUNCTION(BlueprintImplementableEvent)
void OnInteract(AActor* Interactor);
```

```angelscript
// Angelscript override
class AMyInteractable : AInteractableBase
{
    UFUNCTION(BlueprintOverride)
    void OnInteract(AActor Interactor)
    {
        Print(f"Interacted by {Interactor.GetName()}");
    }
}
```

#### Skipping Functions

Functions can be skipped for angelscript binds even if they are otherwise accessible to blueprint by adding the `NotInAngelscript` metadata.

#### Deprecated Functions

Functions marked as deprecated are not bound to script at all.

There is no deprecation warning functionality in script, so engine upgrades may necessitate script changes when Epic deprecates certain APIs.

### Static Functions

Static functions declared on `UCLASS`es are bound as namespaced global functions in script.

```cpp
// C++ static function on a class
UCLASS()
class UMyBlueprintLibrary : public UBlueprintFunctionLibrary
{
    UFUNCTION(BlueprintCallable, Category = "Utils")
    static FVector GetRandomPointInBox(const FVector& Origin, const FVector& Extent);
};
```

```angelscript
// In Angelscript, called via simplified namespace:
FVector Point = MyBlueprintLibrary::GetRandomPointInBox(Origin, Extent);
// Or after namespace simplification (if unambiguous):
FVector Point = GetRandomPointInBox(Origin, Extent);
```

Note that for static functions only, the name of the class will go through [Namespace Simplification](/scripting/function-libraries/#namespace-simplification) when they are bound.

### Enum Bindings

Any `UENUM()` declared in C++ is automatically usable in script.

```cpp
UENUM(BlueprintType)
enum class EDamageType : uint8
{
    Physical,
    Fire,
    Ice,
    Lightning
};
```

```angelscript
// Used directly by name in Angelscript:
EDamageType DmgType = EDamageType::Fire;

if (DmgType == EDamageType::Ice)
    ApplySlowEffect();
```

### Binding Summary Table

| C++ Specifier | Angelscript Access | Notes |
|---|---|---|
| `BlueprintType` | Class/struct available | Required for type to be bound |
| `BlueprintReadWrite` | Read + write | Full property access |
| `BlueprintReadOnly` | Read only (`const`) | Cannot assign in script |
| `ScriptReadWrite` | Read + write | Script-only, hidden from Blueprint |
| `ScriptReadOnly` | Read only | Script-only, hidden from Blueprint |
| `EditAnywhere` (no BP flag) | `default` statement only | Cannot use in function bodies |
| `BlueprintCallable` | Callable | Standard function binding |
| `BlueprintPure` | Callable (no side effects) | Can be used in expressions |
| `ScriptCallable` | Callable | Script-only, hidden from Blueprint |
| `BlueprintImplementableEvent` | Override with `BlueprintOverride` | Script provides implementation |
| `BlueprintNativeEvent` | Override with `BlueprintOverride` | Script can override C++ default |
| `NotInAngelscript` | Hidden | Skipped during binding |
| `NoAutoAngelscriptBind` | Hidden (structs) | Skipped during binding |

## Script Mixin Libraries

Instead of adding new namespaced static functions for scripts, it can be useful to provide additional *methods* on existing types.

To do this, use the `ScriptMixin` metadata on a C++ class with static functions.
Any static function whose first argument matches the type specified in the metadata will be bound as a method on that type.

A common use case for this is to add methods to `USTRUCT`s, which cannot have `UFUNCTION`s on them, and as such cannot have methods using normal automatic bindings.

### Mixin Libraries for Structs

For example, the following C++ mixin library class adds two new methods to the `FVector` struct in script:

```cpp
UCLASS(Meta = (ScriptMixin = "FVector"))
class UFVectorScriptMixinLibrary : public UObject
{
	GENERATED_BODY()
public:

	// This will be accessible in script as
	//     FVector Vector;
	//     Vector.ResetTo(4.0);
	UFUNCTION(ScriptCallable)
	static void ResetTo(FVector& Vector, float NewValue)
	{
		Vector = FVector(NewValue, NewValue, NewValue);
	}

	// This will become a const method, as it takes
	// a const reference to the mixin type:
	//  Usable in script as both   Vector.SummedValue
	//                        or   Vector.GetSummedValue()
	UFUNCTION(ScriptCallable)
	static float GetSummedValue(const FVector& Vector)
	{
		return Vector.X+Vector.Y+Vector.Z;
	}
}
```

### Mixin Libraries for Classes

It is also possible to add new methods to `UCLASS`es. In that case, take a pointer to the type as the first argument.

The following C++ mixin library adds a new method to all `AActor`s in script:

```cpp
UCLASS(Meta = (ScriptMixin = "AActor"))
class UMyActorMixinLibrary : public UObject
{
	GENERATED_BODY()
public:

	// This can be used in script as:
	//  Actor.TeleportToOrigin();
	UFUNCTION(ScriptCallable)
	static void TeleportToOrigin(AActor* Actor)
	{
		Actor->SetActorLocation(FVector(0, 0, 0));
	}
}
```

> **Note:** The angelscript plugin comes with a number of mixin libraries in it, mostly to expose C++ functionality that is not normally exposed to blueprint.
>  For example, see the [TimelineComponentMixinLibrary](https://github.com/Hazelight/UnrealEngine-Angelscript/blob/angelscript-master/Engine/Plugins/Angelscript/Source/AngelscriptCode/Public/FunctionLibraries/TimelineComponentMixinLibrary.h)

## Using Precompiled Scripts

### Functionality

Normally, when the engine starts up the angelscript plugin will read all `.as` files in your Project's script folder and parse and compile them. This can take a relatively long amount of time, especially on platforms with slower CPUs and hard drives.

In order to improve startup time in packaged builds, it is possible to instruct the packaged binary to emit a precompiled script cache. When a precompiled script cache file is present, the plugin will load the compiled script bytecode directly from the cache, skipping the need to load, parse and compile all the script files.

In addition to this, the plugin is able to generate a directory of C++ code files that function the same as the angelscript bytecode for your scripts. Recompiling the game binary with these C++ files included in it will then hook into angelscript's JIT compilation system to replace virtual machine bytecode execution with native C++. This significantly improves runtime execution speed of script code.

### Usage

Precompiled script must be generated by the same `.exe` binary that it will be loaded by.

To trigger the generation:

- Package your game in the configuration you want to run.
- Run your `ProjectName.exe` while specifying the `-as-generate-precompiled-data` command line parameter.

This generates a file `ProjectName/Script/PrecompiledScript.Cache` that should be part of your game distribution.

The next time you run your packaged game, script will be loaded from the precompiled cache instead of from the `.as` scripts.

### Transpiled C++ Code

In addition to the cache, the generate step will also output a folder called `AS_JITTED_CODE/` with a file in it for every script file that was compiled.

You can copy this folder into your project's source folder and then rebuild the `.exe` for your game in the appropriate configuration.

When including the `AS_JITTED_CODE/` folder in your project ensure that the module that it's being included it has `AngelscriptCode` as a dependency, i.e. within your project's Build.cs file.

Using the new `.exe` compiled with the included `AS_JITTED_CODE/` and in combination with the `PrecompiledScript.Cache` file will let the angelscript plugin automatically run the correct optimized C++ code when executing angelscript.

### Compatibility

Because precompiled scripts directly contain hardcoded byte offsets to C++ properties and sizes of C++ structures, you should never use a `PrecompiledScript.Cache` file that was generated by a different binary than it is being used by.

Whenever you rebuild your game's packaged `.exe`, **always** regenerate the precompiled script cache from that `.exe`. (The necessary exception of course being the rebuild when you add the generated C++ code to the binary)

The inverse is not necessary: it is possible to change the `.as` script files and generate a new `PrecompiledScript.Cache` without recompiling the game binary. If the old binary contained generated C++ code, it will no longer match the precompiled script cache and will not be used until the binary is rebuilt with the new `AS_JITTED_CODE`.

### Reloading Scripts

When using a `PrecompiledScript.Cache` file, the actual `.as` script files are not loaded from the script folder. This means changes to those files will not be used, and hot reload is disabled.

In order to circumvent loading precompiled scripts when they are present, you can pass the `-as-development-mode` command line parameter to your packaged game binary.
