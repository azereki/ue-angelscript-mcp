import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config, getScriptRoots } from "../config.js";

const SCAFFOLDS = {
  Actor: (name: string) => `class ${name} : AActor
{
\tUPROPERTY()
\tint ExampleValue = 15;

\tdefault bReplicates = true;

\tUFUNCTION(BlueprintOverride)
\tvoid BeginPlay()
\t{
\t\t// Called when the game starts or when spawned
\t}

\tUFUNCTION(BlueprintOverride)
\tvoid Tick(float DeltaTime)
\t{
\t\t// Called every frame
\t}
}`,
  Component: (name: string) => `class ${name} : UActorComponent
{
\tUPROPERTY()
\tfloat ExampleProperty = 1.0f;

\tdefault bWantsInitializeComponent = true;

\tUFUNCTION(BlueprintOverride)
\tvoid InitializeComponent()
\t{
\t\t// Component initialization logic
\t}

\tUFUNCTION(BlueprintOverride)
\tvoid BeginPlay()
\t{
\t\t// Called when the owning actor begins play
\t}

\tUFUNCTION(BlueprintOverride)
\tvoid TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction TickFunction)
\t{
\t\t// Called every frame
\t}
}`,
  Widget: (name: string) => `class ${name} : UUserWidget
{
\t// BindWidget requires a widget of the exact same name to exist in the UMG designer
\t// UPROPERTY(BindWidget)
\t// UTextBlock MainText;

\tUFUNCTION(BlueprintOverride)
\tvoid Construct()
\t{
\t\t// Called when the widget is created
\t}

\tUFUNCTION(BlueprintOverride)
\tvoid Tick(FGeometry MyGeometry, float DeltaTime)
\t{
\t\t// Called every frame
\t}
}`,
  Subsystem: (name: string) => `class ${name} : UGameInstanceSubsystem
{
\tUFUNCTION(BlueprintOverride)
\tvoid Initialize(FSubsystemCollectionBase& Collection)
\t{
\t\t// Called when the subsystem is initialized
\t}

\tUFUNCTION(BlueprintOverride)
\tvoid Deinitialize()
\t{
\t\t// Called when the subsystem is shut down
\t}
}`,
  UnitTest: (name: string) => `void Test_${name}(FUnitTest& T)
{
\t// Setup

\t// Execute
\tint Result = 1 + 1;

\t// Verify
\tT.AssertEquals(2, Result);
\t// T.AssertTrue(bCondition);
\t// T.AssertNotNull(Pointer);
}`,
  IntegrationTest: (name: string) => `void IntegrationTest_${name}(FIntegrationTest& T)
{
\t// Setup test environment (will use map /Content/Testing/IntegrationTest_${name}.umap by default)
\t
\t// T.StartLatentCommand(FLatentAction());
}`
};

export function registerScaffoldTools(server: McpServer): void {
  server.tool(
    "as_scaffold",
    "Generate idiomatic Angelscript boilerplate for Unreal Engine classes and tests.",
    {
      type: z.enum(["Actor", "Component", "Widget", "Subsystem", "UnitTest", "IntegrationTest"])
        .describe("The type of class or test to generate"),
      name: z.string().describe("The name of the class or test (e.g., 'AMyDoorActor', 'MyFeature')"),
      writePath: z.string().optional()
        .describe("Optional absolute path to write the generated file to. If omitted, returns the code as text."),
    },
    async (args) => {
      // Standardize class prefixes if omitted (A for Actor, U for Component/Widget/Subsystem)
      let finalName = args.name;
      if (args.type === "Actor" && !finalName.startsWith("A")) {
        finalName = "A" + finalName;
      } else if ((args.type === "Component" || args.type === "Widget" || args.type === "Subsystem") && !finalName.startsWith("U")) {
        finalName = "U" + finalName;
      }

      const code = SCAFFOLDS[args.type](finalName);

      if (args.writePath) {
        try {
          const outDir = path.dirname(args.writePath);
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          fs.writeFileSync(args.writePath, code, "utf8");
          return {
            content: [{ type: "text" as const, text: `Successfully wrote ${args.type} scaffold to ${args.writePath}\n\n${code}` }],
          };
        } catch (e: any) {
          return {
            content: [{ type: "text" as const, text: `Failed to write file: ${e.message}\n\nFallback code:\n${code}` }],
          };
        }
      }

      return {
        content: [{ type: "text" as const, text: code }],
      };
    }
  );
}
