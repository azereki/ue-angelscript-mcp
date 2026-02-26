export interface AstClass {
  name: string;
  parent: string | null;
  properties: string[];
  methods: string[];
}

export interface AstStruct {
  name: string;
  properties: string[];
  methods: string[];
}

export interface AstEnum {
  name: string;
  values: string[];
}

export interface AstFile {
  classes: AstClass[];
  structs: AstStruct[];
  enums: AstEnum[];
  delegates: string[];
  globalFunctions: string[];
  globalVariables: string[];
}

export function parseAngelscriptAST(source: string): AstFile {
  const result: AstFile = {
    classes: [],
    structs: [],
    enums: [],
    delegates: [],
    globalFunctions: [],
    globalVariables: []
  };

  // 1. Strip comments and string literals to make parsing easier
  let cleanSource = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] === '/' && source[i+1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
    } else if (source[i] === '/' && source[i+1] === '*') {
      i += 2;
      while (i < source.length - 1 && !(source[i] === '*' && source[i+1] === '/')) i++;
      i += 2;
    } else if (source[i] === '"') {
      cleanSource += '"';
      i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === '\\') { cleanSource += source[i]; i++; }
        cleanSource += source[i]; i++;
      }
      if (i < source.length) { cleanSource += '"'; i++; }
    } else if (source[i] === "'") {
      cleanSource += "'";
      i++;
      while (i < source.length && source[i] !== "'") {
        if (source[i] === '\\') { cleanSource += source[i]; i++; }
        cleanSource += source[i]; i++;
      }
      if (i < source.length) { cleanSource += "'"; i++; }
    } else {
      cleanSource += source[i];
      i++;
    }
  }

  // Define regexes
  const classRegex = /\bclass\s+([A-Za-z_]\w*)(?:\s*:\s*([A-Za-z_][\w:]*))?\s*\{/g;
  const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
  const enumRegex = /\benum\s+([A-Za-z_]\w*)\s*\{/g;
  const delegateRegex = /\bdelegate\s+[^;]+;\s*/g;

  function findMatchingBrace(text: string, startIndex: number): number {
    let depth = 0;
    for (let j = startIndex; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  }

  // Parse methods and properties inside a class/struct body
  function parseBody(body: string, isStruct: boolean) {
    const properties: string[] = [];
    const methods: string[] = [];

    let flatBody = "";
    let depth = 0;
    for (let j = 0; j < body.length; j++) {
      if (body[j] === '{') {
        depth++;
      } else if (body[j] === '}') {
        depth--;
      } else if (depth === 0) {
        flatBody += body[j];
      }
    }

    const methodRegex = /(?:UFUNCTION\s*\([^)]*\)\s*)?(?:[A-Za-z_][\w<>:]*\s+)+([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:const\s*)?(?:override\s*)?\{/g;
    let match;
    while ((match = methodRegex.exec(body)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        methods.push(match[1]);
      }
    }

    const propRegex = /(?:UPROPERTY\s*\([^)]*\)\s*)?(?:[A-Za-z_][\w<>:]*\s+)+([A-Za-z_]\w*)\s*(?:=\s*[^;]+)?;/g;
    while ((match = propRegex.exec(flatBody)) !== null) {
      const name = match[1];
      if (name !== 'default' && name !== 'return' && name !== 'continue' && name !== 'break') {
         properties.push(name);
      }
    }

    return { properties, methods };
  }

  let match;
  while ((match = delegateRegex.exec(cleanSource)) !== null) {
    const decl = match[0].trim();
    const nameMatch = decl.match(/delegate\s+(?:[A-Za-z_][\w<>:]*\s+)+([A-Za-z_]\w*)\s*\(/);
    if (nameMatch) {
      result.delegates.push(nameMatch[1]);
    }
  }

  while ((match = classRegex.exec(cleanSource)) !== null) {
    const name = match[1];
    const parent = match[2] || null;
    const startIndex = match.index + match[0].length - 1; 
    const endIndex = findMatchingBrace(cleanSource, startIndex);
    
    if (endIndex !== -1) {
      const body = cleanSource.substring(startIndex + 1, endIndex);
      const parsed = parseBody(body, false);
      result.classes.push({ name, parent, properties: parsed.properties, methods: parsed.methods });
      
      cleanSource = cleanSource.substring(0, match.index) + 
                    " ".repeat(endIndex - match.index + 1) + 
                    cleanSource.substring(endIndex + 1);
    }
  }

  while ((match = structRegex.exec(cleanSource)) !== null) {
    const name = match[1];
    const startIndex = match.index + match[0].length - 1;
    const endIndex = findMatchingBrace(cleanSource, startIndex);
    
    if (endIndex !== -1) {
      const body = cleanSource.substring(startIndex + 1, endIndex);
      const parsed = parseBody(body, true);
      result.structs.push({ name, properties: parsed.properties, methods: parsed.methods });
      
      cleanSource = cleanSource.substring(0, match.index) + 
                    " ".repeat(endIndex - match.index + 1) + 
                    cleanSource.substring(endIndex + 1);
    }
  }

  while ((match = enumRegex.exec(cleanSource)) !== null) {
    const name = match[1];
    const startIndex = match.index + match[0].length - 1;
    const endIndex = findMatchingBrace(cleanSource, startIndex);
    
    if (endIndex !== -1) {
      const body = cleanSource.substring(startIndex + 1, endIndex);
      const values = body.split(',').map(s => s.trim().split('=')[0].trim()).filter(s => s.length > 0 && !s.startsWith('//'));
      result.enums.push({ name, values });
      
      cleanSource = cleanSource.substring(0, match.index) + 
                    " ".repeat(endIndex - match.index + 1) + 
                    cleanSource.substring(endIndex + 1);
    }
  }

  const globalFuncRegex = /(?:UFUNCTION\s*\([^)]*\)\s*)?(?:[A-Za-z_][\w<>:]*\s+)+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g;
  while ((match = globalFuncRegex.exec(cleanSource)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
      result.globalFunctions.push(match[1]);
    }
  }

  return result;
}