/**
 * utils/powershell/parser.ts
 *
 * 通过子进程 pwsh 调用 PowerShell 语言解析器得到 AST JSON，规范化为 ParsedPowerShellCommand，带每宿主 LRU 缓存与命令/重定向/变量/安全标志查询工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/powershell/parser.ts
 * pieces: chunk-e6aww6q8.js (38)
 * attribution: affinity 1, fingerprint 26, layout 7, callgraph-fingerprint 1, file-local 2, callgraph-witnessed 1
 */
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { getCachedPowerShellPath } from "../shell/powershellDetection.js";
import { errorMessage } from "../errors.js";
import { safeExecFile } from "../safeSpawn.js";
import { withDeadline } from "../sleep.js";
import { jsonParse } from "../slowOperations.js";
import { memoizeWithLRU } from "../memoize.js";
import { logError } from "../log.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:835740-835753 affinity
var DEFAULT_PARSE_TIMEOUT_MS = 5000;
//@ chunk-e6aww6q8.js:835753-835849 fingerprint = getParseTimeoutMs (1)
/**
 * PowerShell 解析超时：CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS（>0）否则 5000ms。
 */
function getParseTimeoutMs() {
  let env_2 = env.CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS;
  if (env_2 !== undefined && env_2 > 0) return env_2;
  return DEFAULT_PARSE_TIMEOUT_MS;
}
//@ chunk-e6aww6q8.js:835849-835867 layout
var PARSE_ATTEMPTS = 2;
var MAX_WALL_SLACK_MS = 1e4;
//@ chunk-e6aww6q8.js:835867-835908 layout
function getWallClockDeadlineMs(parseTimeoutMs) {
  return parseTimeoutMs + Math.min(parseTimeoutMs, MAX_WALL_SLACK_MS);
}
//@ chunk-e6aww6q8.js:835908-846874 fingerprint = INVALID_RESULT_BASE (1)
/**
 * pwsh 内执行的解析脚本：用 System.Management.Automation.Language.Parser 解析 stdin 里 base64 的命令，输出语句/命令元素/重定向/变量/安全模式（子表达式、脚本块、展开串、成员调用、splat、类型字面量、using、#requires、后台作业）的 JSON，再 base64 回传。
 */
var PARSE_SCRIPT_BODY = `
function Write-Result($Json) {
    [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Json))
}
$EncodedCommand = [Console]::In.ReadToEnd()
if (-not $EncodedCommand) {
    Write-Result '{"valid":false,"errors":[{"message":"No command provided","errorId":"NoInput"}],"statements":[],"variables":[],"hasStopParsing":false,"originalCommand":""}'
    exit 0
}

$Command = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedCommand))

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput(
    $Command,
    [ref]$tokens,
    [ref]$parseErrors
)

$allVariables = [System.Collections.ArrayList]::new()

function Get-RawCommandElements {
    param([System.Management.Automation.Language.CommandAst]$CmdAst)
    $elems = [System.Collections.ArrayList]::new()
    foreach ($ce in $CmdAst.CommandElements) {
        $ceData = @{ type = $ce.GetType().Name; text = $ce.Extent.Text }
        if ($ce.PSObject.Properties['Value'] -and $null -ne $ce.Value -and $ce.Value -is [string]) {
            $ceData.value = $ce.Value
        }
        if ($ce -is [System.Management.Automation.Language.CommandExpressionAst]) {
            $ceData.expressionType = $ce.Expression.GetType().Name
        }
        $a=$ce.Argument;if($a){$ceData.children=@(@{type=$a.GetType().Name;text=$a.Extent.Text})}
        [void]$elems.Add($ceData)
    }
    return $elems
}

function Get-RawRedirections {
    param($Redirections)
    $result = [System.Collections.ArrayList]::new()
    foreach ($redir in $Redirections) {
        $redirData = @{ type = $redir.GetType().Name }
        if ($redir -is [System.Management.Automation.Language.FileRedirectionAst]) {
            $redirData.append = [bool]$redir.Append
            $redirData.fromStream = $redir.FromStream.ToString()
            $redirData.locationText = $redir.Location.Extent.Text
        }
        [void]$result.Add($redirData)
    }
    return $result
}

function Get-SecurityPatterns($A) {
    $p = @{}
    foreach ($n in $A.FindAll({ param($x)
        $x -is [System.Management.Automation.Language.MemberExpressionAst] -or
        $x -is [System.Management.Automation.Language.SubExpressionAst] -or
        $x -is [System.Management.Automation.Language.ArrayExpressionAst] -or
        $x -is [System.Management.Automation.Language.ExpandableStringExpressionAst] -or
        $x -is [System.Management.Automation.Language.ScriptBlockExpressionAst] -or
        $x -is [System.Management.Automation.Language.ParenExpressionAst]
    }, $true)) { switch ($n.GetType().Name) {
        'InvokeMemberExpressionAst' { $p.hasMemberInvocations = $true }
        'MemberExpressionAst' { $p.hasMemberInvocations = $true }
        'SubExpressionAst' { $p.hasSubExpressions = $true }
        'ArrayExpressionAst' { $p.hasSubExpressions = $true }
        'ParenExpressionAst' { $p.hasSubExpressions = $true }
        'ExpandableStringExpressionAst' { $p.hasExpandableStrings = $true }
        'ScriptBlockExpressionAst' { $p.hasScriptBlocks = $true }
    }}
    if ($p.Count -gt 0) { return $p }
    return $null
}

$varExprs = $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.VariableExpressionAst] }, $true)
foreach ($v in $varExprs) {
    [void]$allVariables.Add(@{
        path = $v.VariablePath.ToString()
        isSplatted = [bool]$v.Splatted
    })
}

$typeLiterals = [System.Collections.ArrayList]::new()
foreach ($t in $ast.FindAll({ param($n)
    $n -is [System.Management.Automation.Language.TypeExpressionAst] -or
    $n -is [System.Management.Automation.Language.TypeConstraintAst]
}, $true)) { [void]$typeLiterals.Add($t.TypeName.FullName) }

$hasStopParsing = $false
foreach ($tok in $tokens) {
    $norm = $tok.Text -replace '[\\u2013\\u2014\\u2015]','-' -replace '[\`''""\\u2018-\\u201f]',''
    if ($norm -eq '--%') {
        $hasStopParsing = $true; break
    }
}

$statements = [System.Collections.ArrayList]::new()
$script:hasBg = $false
foreach ($p in $ast.FindAll({param($n) $n -is [System.Management.Automation.Language.PipelineBaseAst]}, $true)) {
    if ($p.PSObject.Properties['Background'] -and $p.Background) { $script:hasBg = $true; break }
}

function Process-BlockStatements {
    param($Block)
    if (-not $Block) { return }

    foreach ($stmt in $Block.Statements) {
        $statement = @{
            type = $stmt.GetType().Name
            text = $stmt.Extent.Text
        }

        if ($stmt -is [System.Management.Automation.Language.PipelineAst]) {
            $elements = [System.Collections.ArrayList]::new()
            foreach ($element in $stmt.PipelineElements) {
                $elemData = @{
                    type = $element.GetType().Name
                    text = $element.Extent.Text
                }

                if ($element -is [System.Management.Automation.Language.CommandAst]) {
                    $elemData.commandElements = @(Get-RawCommandElements -CmdAst $element)
                    $elemData.redirections = @(Get-RawRedirections -Redirections $element.Redirections)
                } elseif ($element -is [System.Management.Automation.Language.CommandExpressionAst]) {
                    $elemData.expressionType = $element.Expression.GetType().Name
                    $elemData.redirections = @(Get-RawRedirections -Redirections $element.Redirections)
                }

                [void]$elements.Add($elemData)
            }
            $statement.elements = @($elements)

            $allNestedCmds = $stmt.FindAll(
                { param($node) $node -is [System.Management.Automation.Language.CommandAst] },
                $true
            )
            $nestedCmds = [System.Collections.ArrayList]::new()
            foreach ($cmd in $allNestedCmds) {
                if ($cmd.Parent -eq $stmt) { continue }
                $nested = @{
                    type = $cmd.GetType().Name
                    text = $cmd.Extent.Text
                    commandElements = @(Get-RawCommandElements -CmdAst $cmd)
                    redirections = @(Get-RawRedirections -Redirections $cmd.Redirections)
                }
                [void]$nestedCmds.Add($nested)
            }
            if ($nestedCmds.Count -gt 0) {
                $statement.nestedCommands = @($nestedCmds)
            }
            $r = $stmt.FindAll({param($n) $n -is [System.Management.Automation.Language.FileRedirectionAst]}, $true)
            if ($r.Count -gt 0) {
                $rr = @(Get-RawRedirections -Redirections $r)
                $statement.redirections = if ($statement.redirections) { @($statement.redirections) + $rr } else { $rr }
            }
        } else {
            $nestedCmdAsts = $stmt.FindAll(
                { param($node) $node -is [System.Management.Automation.Language.CommandAst] },
                $true
            )
            $nested = [System.Collections.ArrayList]::new()
            foreach ($cmd in $nestedCmdAsts) {
                [void]$nested.Add(@{
                    type = 'CommandAst'
                    text = $cmd.Extent.Text
                    commandElements = @(Get-RawCommandElements -CmdAst $cmd)
                    redirections = @(Get-RawRedirections -Redirections $cmd.Redirections)
                })
            }
            if ($nested.Count -gt 0) {
                $statement.nestedCommands = @($nested)
            }
            $r = $stmt.FindAll({param($n) $n -is [System.Management.Automation.Language.FileRedirectionAst]}, $true)
            if ($r.Count -gt 0) { $statement.redirections = @(Get-RawRedirections -Redirections $r) }
        }

        $sp = Get-SecurityPatterns $stmt
        if ($sp) { $statement.securityPatterns = $sp }

        [void]$statements.Add($statement)
    }

    if ($Block.Traps) {
        foreach ($trap in $Block.Traps) {
            $statement = @{
                type = 'TrapStatementAst'
                text = $trap.Extent.Text
            }
            $nestedCmdAsts = $trap.FindAll(
                { param($node) $node -is [System.Management.Automation.Language.CommandAst] },
                $true
            )
            $nestedCmds = [System.Collections.ArrayList]::new()
            foreach ($cmd in $nestedCmdAsts) {
                $nested = @{
                    type = $cmd.GetType().Name
                    text = $cmd.Extent.Text
                    commandElements = @(Get-RawCommandElements -CmdAst $cmd)
                    redirections = @(Get-RawRedirections -Redirections $cmd.Redirections)
                }
                [void]$nestedCmds.Add($nested)
            }
            if ($nestedCmds.Count -gt 0) {
                $statement.nestedCommands = @($nestedCmds)
            }
            $r = $trap.FindAll({param($n) $n -is [System.Management.Automation.Language.FileRedirectionAst]}, $true)
            if ($r.Count -gt 0) { $statement.redirections = @(Get-RawRedirections -Redirections $r) }
            $sp = Get-SecurityPatterns $trap
            if ($sp) { $statement.securityPatterns = $sp }
            [void]$statements.Add($statement)
        }
    }
}

Process-BlockStatements -Block $ast.BeginBlock
Process-BlockStatements -Block $ast.ProcessBlock
Process-BlockStatements -Block $ast.EndBlock
Process-BlockStatements -Block $ast.CleanBlock
Process-BlockStatements -Block $ast.DynamicParamBlock

if ($ast.ParamBlock) {
  $pb = $ast.ParamBlock
  $pn = [System.Collections.ArrayList]::new()
  foreach ($c in $pb.FindAll({param($n) $n -is [System.Management.Automation.Language.CommandAst]}, $true)) {
    [void]$pn.Add(@{type='CommandAst';text=$c.Extent.Text;commandElements=@(Get-RawCommandElements -CmdAst $c);redirections=@(Get-RawRedirections -Redirections $c.Redirections)})
  }
  $pr = $pb.FindAll({param($n) $n -is [System.Management.Automation.Language.FileRedirectionAst]}, $true)
  $ps = Get-SecurityPatterns $pb
  $st = @{type='ParamBlockAst';text=$pb.Extent.Text}
  if ($pn.Count -gt 0) { $st.nestedCommands = @($pn) }
  if ($pr.Count -gt 0) { $st.redirections = @(Get-RawRedirections -Redirections $pr) }
  if ($ps) { $st.securityPatterns = $ps }
  [void]$statements.Add($st)
}

$hasUsingStatements = $ast.UsingStatements -and $ast.UsingStatements.Count -gt 0
$hasScriptRequirements = $ast.ScriptRequirements -ne $null

$output = @{
    valid = ($parseErrors.Count -eq 0)
    errors = @($parseErrors | ForEach-Object {
        @{
            message = $_.Message
            errorId = $_.ErrorId
        }
    })
    statements = @($statements)
    variables = @($allVariables)
    hasStopParsing = $hasStopParsing
    originalCommand = $Command
    typeLiterals = @($typeLiterals)
    hasUsingStatements = [bool]$hasUsingStatements
    hasScriptRequirements = [bool]$hasScriptRequirements
    hasBackgroundJob = [bool]$script:hasBg
}

Write-Result ($output | ConvertTo-Json -Depth 10 -Compress)
`;
var MAX_PARSE_COMMAND_BYTES = 32767;
var INVALID_RESULT_BASE = {
  valid: false,
  statements: [],
  variables: [],
  hasStopParsing: false,
};
//@ chunk-e6aww6q8.js:846874-846957 fingerprint = makeInvalidResult (1)
/**
 * 构造无效解析结果（valid:false，带 errorId 与原命令）。
 */
function makeInvalidResult(command, message, errorId) {
  return {
    ...INVALID_RESULT_BASE,
    errors: [
      {
        message,
        errorId,
      },
    ],
    originalCommand: command,
  };
}
//@ chunk-e6aww6q8.js:846957-847019 layout
/**
 * 把 Unicode 破折号（U+2013/2014/2015）换成 ASCII “-”；PowerShell 会把它们当参数前缀，校验前先归一。
 */
function normalizeUnicodeDashes(text) {
  return text.replace(/[\u2013\u2014\u2015]/g, "-");
}
//@ chunk-e6aww6q8.js:847019-847246 fingerprint = toUtf16LeBase64 (0.856)
/**
 * 字符串转 UTF-16LE 再 base64（-EncodedCommand 格式）。
 */
function toUtf16LeBase64(text) {
  if (typeof Buffer !== "undefined") return Buffer.from(text, "utf16le").toString("base64");
  let bytes = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    bytes.push(code & 255, (code >> 8) & 255);
  }
  return btoa(bytes.map((byte) => String.fromCharCode(byte)).join(""));
}
//@ chunk-e6aww6q8.js:847246-847392 callgraph-fingerprint = buildParseScript (0.182)
/**
 * pwsh 参数（-NoProfile -NonInteractive -NoLogo -EncodedCommand <解析脚本>）与 stdin（命令的 base64）。
 */
function buildParseInvocation(command) {
  return {
    args: ["-NoProfile", "-NonInteractive", "-NoLogo", "-EncodedCommand", toUtf16LeBase64(PARSE_SCRIPT_BODY)],
    input: Buffer.from(command, "utf8").toString("base64"),
  };
}
//@ chunk-e6aww6q8.js:847392-847470 file-local
function ensureArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
//@ chunk-e6aww6q8.js:847470-848233 fingerprint = mapStatementType (1)
function mapStatementType(rawType) {
  switch (rawType) {
    case "PipelineAst":
      return "PipelineAst";
    case "PipelineChainAst":
      return "PipelineChainAst";
    case "AssignmentStatementAst":
      return "AssignmentStatementAst";
    case "IfStatementAst":
      return "IfStatementAst";
    case "ForStatementAst":
      return "ForStatementAst";
    case "ForEachStatementAst":
      return "ForEachStatementAst";
    case "WhileStatementAst":
      return "WhileStatementAst";
    case "DoWhileStatementAst":
      return "DoWhileStatementAst";
    case "DoUntilStatementAst":
      return "DoUntilStatementAst";
    case "SwitchStatementAst":
      return "SwitchStatementAst";
    case "TryStatementAst":
      return "TryStatementAst";
    case "TrapStatementAst":
      return "TrapStatementAst";
    case "FunctionDefinitionAst":
      return "FunctionDefinitionAst";
    case "DataStatementAst":
      return "DataStatementAst";
    default:
      return "UnknownStatementAst";
  }
}
//@ chunk-e6aww6q8.js:848233-848828 fingerprint = mapElementType (1)
function mapElementType(rawType, expressionType) {
  switch (rawType) {
    case "ScriptBlockExpressionAst":
      return "ScriptBlock";
    case "SubExpressionAst":
    case "ArrayExpressionAst":
      return "SubExpression";
    case "ExpandableStringExpressionAst":
      return "ExpandableString";
    case "InvokeMemberExpressionAst":
    case "MemberExpressionAst":
      return "MemberInvocation";
    case "VariableExpressionAst":
      return "Variable";
    case "StringConstantExpressionAst":
    case "ConstantExpressionAst":
      return "StringConstant";
    case "CommandParameterAst":
      return "Parameter";
    case "ParenExpressionAst":
      return "SubExpression";
    case "CommandExpressionAst":
      if (expressionType) return mapElementType(expressionType);
      return "Other";
    default:
      return "Other";
  }
}
//@ chunk-e6aww6q8.js:848828-848962 fingerprint = classifyCommandName (1)
/**
 * 按名字形状粗分命令：动词-名词为 cmdlet，含 . \ / 为外部程序，否则 unknown。
 */
function classifyCommandName(name) {
  if (/^[A-Za-z]+-[A-Za-z][A-Za-z0-9_]*$/.test(name)) return "cmdlet";
  if (/[.\\/]/.test(name)) return "application";
  return "unknown";
}
//@ chunk-e6aww6q8.js:848962-849169 fingerprint = stripModulePrefix (1)
/**
 * 去掉 cmdlet 的模块限定前缀（Module\Get-Item → Get-Item）；盘符路径、UNC、.\、..\ 开头的路径保持原样。
 */
function stripModulePrefix(name) {
  let idx = name.lastIndexOf("\\");
  if (idx < 0) return name;
  if (/^[A-Za-z]:/.test(name) || name.startsWith("\\\\") || name.startsWith(".\\") || name.startsWith("..\\"))
    return name;
  let r = name.substring(idx + 1);
  if (r === "") return name;
  return r;
}
//@ chunk-e6aww6q8.js:849169-850065 fingerprint = transformCommandAst (1)
function transformCommandAst(raw) {
  let cmdElements = ensureArray(raw.commandElements);
  let name = "";
  let args = [];
  let elementTypes = [];
  let children = [];
  let hasChildren = false;
  let nameType = "unknown";
  if (cmdElements.length > 0) {
    let first = cmdElements[0];
    let rawName = (
      (first.type === "StringConstantExpressionAst" || first.type === "ExpandableStringExpressionAst") &&
      typeof first.value === "string"
        ? first.value
        : first.text
    ).replace(/^['"]|['"]$/g, "");
    if (/[\u0080-\uFFFF]/.test(rawName)) nameType = "application";
    else nameType = classifyCommandName(rawName);
    name = normalizeUnicodeDashes(stripModulePrefix(rawName));
    elementTypes.push(mapElementType(first.type, first.expressionType));
    for (let i = 1; i < cmdElements.length; i++) {
      let Ee = cmdElements[i];
      let isStringLiteral =
        Ee.type === "StringConstantExpressionAst" || Ee.type === "ExpandableStringExpressionAst";
      args.push(normalizeUnicodeDashes(isStringLiteral && Ee.value != null ? Ee.value : Ee.text));
      elementTypes.push(mapElementType(Ee.type, Ee.expressionType));
      let rawChildren = ensureArray(Ee.children);
      if (rawChildren.length > 0) {
        hasChildren = true;
        children.push(
          rawChildren.map((rawChild) => ({
            type: mapElementType(rawChild.type),
            text: normalizeUnicodeDashes(rawChild.text),
          })),
        );
      } else children.push(undefined);
    }
  }
  let result = {
    name,
    nameType,
    elementType: "CommandAst",
    args,
    text: normalizeUnicodeDashes(raw.text),
    elementTypes,
    ...(hasChildren && {
      children,
    }),
  };
  let rawRedirs = ensureArray(raw.redirections);
  if (rawRedirs.length > 0) result.redirections = rawRedirs.map(transformRedirection);
  return result;
}
//@ chunk-e6aww6q8.js:850065-850291 fingerprint = transformExpressionElement (1)
function transformExpressionElement(raw) {
  let elementType = raw.type === "ParenExpressionAst" ? "ParenExpressionAst" : "CommandExpressionAst";
  let elementTypes = [mapElementType(raw.type, raw.expressionType)];
  return {
    name: normalizeUnicodeDashes(raw.text),
    nameType: "unknown",
    elementType,
    args: [],
    text: normalizeUnicodeDashes(raw.text),
    elementTypes,
  };
}
//@ chunk-e6aww6q8.js:850291-850662 fingerprint = transformRedirection (1)
function transformRedirection(raw) {
  if (raw.type === "MergingRedirectionAst")
    return {
      operator: "2>&1",
      target: "",
      isMerging: true,
    };
  let append = raw.append ?? false;
  let fromStream = raw.fromStream ?? "Output";
  let operator;
  if (append)
    switch (fromStream) {
      case "Error":
        operator = "2>>";
        break;
      case "All":
        operator = "*>>";
        break;
      default:
        operator = ">>";
        break;
    }
  else
    switch (fromStream) {
      case "Error":
        operator = "2>";
        break;
      case "All":
        operator = "*>";
        break;
      default:
        operator = ">";
        break;
    }
  return {
    operator,
    target: raw.locationText ?? "",
    isMerging: false,
  };
}
//@ chunk-e6aww6q8.js:850662-851437 fingerprint = transformStatement (1)
function transformStatement(raw) {
  let statementType = mapStatementType(raw.type);
  let commands = [];
  let redirections = [];
  if (raw.elements) {
    for (let elem of ensureArray(raw.elements))
      if (elem.type === "CommandAst") {
        commands.push(transformCommandAst(elem));
        for (let redir of ensureArray(elem.redirections)) redirections.push(transformRedirection(redir));
      } else {
        commands.push(transformExpressionElement(elem));
        for (let redir of ensureArray(elem.redirections)) redirections.push(transformRedirection(redir));
      }
    let seen = new Set(redirections.map((redirection) => `${redirection.operator}\x00${redirection.target}`));
    for (let redir of ensureArray(raw.redirections)) {
      let G = transformRedirection(redir);
      let key = `${G.operator}\x00${G.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        redirections.push(G);
      }
    }
  } else {
    commands.push({
      name: normalizeUnicodeDashes(raw.text),
      nameType: "unknown",
      elementType: "CommandExpressionAst",
      args: [],
      text: normalizeUnicodeDashes(raw.text),
    });
    for (let redir of ensureArray(raw.redirections)) redirections.push(transformRedirection(redir));
  }
  let nestedCommands;
  let rawNested = ensureArray(raw.nestedCommands);
  if (rawNested.length > 0) nestedCommands = rawNested.map(transformCommandAst);
  let result = {
    statementType,
    commands,
    redirections,
    text: normalizeUnicodeDashes(raw.text),
    nestedCommands,
  };
  if (raw.securityPatterns) result.securityPatterns = raw.securityPatterns;
  return result;
}
//@ chunk-e6aww6q8.js:851437-851831 fingerprint = transformRawOutput (0.934)
/**
 * 把 pwsh 输出的原始 JSON 规范成 ParsedPowerShellCommand（statements、variables、errors、typeLiterals、hasUsingStatements/hasScriptRequirements/hasBackgroundJob）。
 */
function transformRawOutput(raw) {
  let result = {
    valid: raw.valid,
    errors: ensureArray(raw.errors),
    statements: ensureArray(raw.statements).map(transformStatement),
    variables: ensureArray(raw.variables),
    hasStopParsing: raw.hasStopParsing,
    originalCommand: raw.originalCommand,
  };
  let tl = ensureArray(raw.typeLiterals);
  if (tl.length > 0) result.typeLiterals = tl;
  if (raw.hasUsingStatements) result.hasUsingStatements = true;
  if (raw.hasScriptRequirements) result.hasScriptRequirements = true;
  if (raw.hasBackgroundJob) result.hasBackgroundJob = true;
  return result;
}
//@ chunk-e6aww6q8.js:851831-853805 fingerprint = parsePowerShellCommandImpl (0.732)
/**
 * 调 pwsh 解析一条 PowerShell 命令：超过 32767 字节、含 `u{…} 码点转义直接判无效；最多尝试 2 次（spawn 失败/超时/非零退出）；校验回传的 originalCommand 与输入一致，否则 InputMismatch。
 */
async function parsePowerShellCommandImpl(command) {
  let commandBytes = Buffer.byteLength(command, "utf8");
  if (commandBytes > MAX_PARSE_COMMAND_BYTES) {
    logForDebugging(
      `PowerShell parser: command too long (${commandBytes} bytes, max ${MAX_PARSE_COMMAND_BYTES})`,
    );
    return makeInvalidResult(
      command,
      `Command too long for parsing (${commandBytes} bytes). Maximum supported length is ${MAX_PARSE_COMMAND_BYTES} bytes.`,
      "CommandTooLong",
    );
  }
  if (/`u\{[0-9A-Fa-f]/.test(command))
    return makeInvalidResult(
      command,
      "PowerShell `u{HEX} codepoint escape is runtime-resolved and cannot be statically validated.",
      "UnicodeCodepointEscape",
    );
  let pwshPath = await getCachedPowerShellPath();
  if (!pwshPath) return makeInvalidResult(command, "PowerShell is not available", "NoPowerShell");
  let s;
  try {
    s = buildParseInvocation(command);
  } catch (error) {
    logForDebugging(`PowerShell parser: could not encode the parse script: ${errorMessage(error)}`, {
      level: "error",
    });
    return makeInvalidResult(command, "PowerShell parser could not be started", "EncodeError");
  }
  let parseTimeoutMs = getParseTimeoutMs();
  let script = getWallClockDeadlineMs(parseTimeoutMs);
  let stdout = "";
  let stderr = "";
  let code = null;
  let G = false;
  let q = null;
  for (let attempt = 0; attempt < PARSE_ATTEMPTS; attempt++) {
    q = null;
    G = false;
    try {
      let ke = safeExecFile(pwshPath, s.args, {
        input: s.input,
        timeout: parseTimeoutMs,
        reject: false,
        useToolMemoryCgroup: false,
      });
      let result = await withDeadline(ke, script);
      if (result === undefined) {
        ke.catch(() => {});
        G = true;
        code = 1;
      } else {
        stdout = result.stdout;
        stderr = result.stderr;
        G = result.timedOut;
        code = result.failed ? (result.exitCode ?? 1) : 0;
      }
    } catch (e) {
      q = e instanceof Error ? e.message : String(e);
      code = null;
    }
    if (code === 0) break;
    logForDebugging(
      `PowerShell parser: ${q ? `failed to spawn pwsh: ${q}` : G ? `pwsh timed out after ${parseTimeoutMs}ms` : `pwsh exited ${code}: ${stderr}`} (attempt ${attempt + 1})`,
    );
  }
  if (q) return makeInvalidResult(command, `Failed to spawn PowerShell: ${q}`, "PwshSpawnError");
  if (G)
    return makeInvalidResult(command, `pwsh timed out after ${parseTimeoutMs}ms (2 attempts)`, "PwshTimeout");
  if (code !== 0) {
    logForDebugging(`PowerShell parser: pwsh exited with code ${code}, stderr: ${stderr}`);
    return makeInvalidResult(command, `pwsh exited with code ${code}: ${stderr}`, "PwshError");
  }
  let trimmed = stdout.trim();
  if (!trimmed) {
    logForDebugging("PowerShell parser: empty stdout from pwsh");
    return makeInvalidResult(command, "No output from PowerShell parser", "EmptyOutput");
  }
  try {
    let raw = jsonParse(Buffer.from(trimmed, "base64").toString("utf8"));
    if (raw.originalCommand !== command) {
      logForDebugging("PowerShell parser: pwsh did not parse the command it was sent");
      return makeInvalidResult(
        command,
        "PowerShell parser did not receive the command intact",
        "InputMismatch",
      );
    }
    return transformRawOutput(raw);
  } catch {
    logForDebugging(`PowerShell parser: invalid JSON output: ${trimmed.slice(0, 200)}`);
    return makeInvalidResult(command, "Invalid JSON from PowerShell parser", "InvalidJson");
  }
}
//@ chunk-e6aww6q8.js:853805-853943 fingerprint = TRANSIENT_ERROR_IDS (0.769)
/**
 * 暂时性错误 id（spawn 失败、超时、空输出、JSON 无效…）：这类结果不进缓存，下次重解析。
 */
var TRANSIENT_ERROR_IDS = new Set([
  "PwshSpawnError",
  "PwshError",
  "PwshTimeout",
  "EmptyOutput",
  "InvalidJson",
  "InputMismatch",
  "EncodeError",
  "UnexpectedError",
]);
//@ chunk-e6aww6q8.js:853943-854273 fingerprint = parsePowerShellCommandCached (0.496)
/**
 * 每宿主一个 LRU(256) 解析缓存；暂时性失败结果会从缓存删除。
 */
class PowerShellParserCache {
  cached = memoizeWithLRU(
    (command) => {
      let promise = parsePowerShellCommandImpl(command).catch((error) => {
        try {
          logError(error);
        } catch {}
        return makeInvalidResult(command, "PowerShell parser failed unexpectedly", "UnexpectedError");
      });
      let r = () => {
        if (this.cached.cache.get(command) === promise) this.cached.cache.delete(command);
      };
      promise.then((result) => {
        if (!result.valid && TRANSIENT_ERROR_IDS.has(result.errors[0]?.errorId ?? "")) r();
      }, r);
      return promise;
    },
    (command) => command,
    256,
  );
  parse(e) {
    return this.cached(e);
  }
}
//@ chunk-e6aww6q8.js:854273-854300 layout
var POWERSHELL_PARSER_PER_HOST = new HostScoped(() => new PowerShellParserCache());
//@ chunk-e6aww6q8.js:854300-854349 layout
/**
 * 解析 PowerShell 命令（当前宿主的缓存解析器），供 PowerShell 工具的权限/只读/前缀分析使用。
 */
function parsePowerShellCommand(command) {
  return POWERSHELL_PARSER_PER_HOST.of(getRootSession().host).parse(command);
}
//@ chunk-e6aww6q8.js:854349-856049 fingerprint = COMMON_ALIASES (0.984)
/**
 * PowerShell 常用别名到规范 cmdlet 的映射（无原型对象）：ls/dir/gci→Get-ChildItem、cat/gc→Get-Content、rm/del→Remove-Item、iex→Invoke-Expression、iwr→Invoke-WebRequest 等。权限与只读判定按规范名比较，防止用别名绕过规则。
 */
var COMMON_ALIASES = Object.assign(Object.create(null), {
  ls: "Get-ChildItem",
  dir: "Get-ChildItem",
  gci: "Get-ChildItem",
  cat: "Get-Content",
  type: "Get-Content",
  gc: "Get-Content",
  cd: "Set-Location",
  sl: "Set-Location",
  chdir: "Set-Location",
  pushd: "Push-Location",
  popd: "Pop-Location",
  pwd: "Get-Location",
  gl: "Get-Location",
  gi: "Get-Item",
  gp: "Get-ItemProperty",
  ni: "New-Item",
  mkdir: "New-Item",
  md: "New-Item",
  ri: "Remove-Item",
  del: "Remove-Item",
  rd: "Remove-Item",
  rmdir: "Remove-Item",
  rm: "Remove-Item",
  erase: "Remove-Item",
  mi: "Move-Item",
  mv: "Move-Item",
  move: "Move-Item",
  ci: "Copy-Item",
  cp: "Copy-Item",
  copy: "Copy-Item",
  cpi: "Copy-Item",
  si: "Set-Item",
  rni: "Rename-Item",
  ren: "Rename-Item",
  ps: "Get-Process",
  gps: "Get-Process",
  kill: "Stop-Process",
  spps: "Stop-Process",
  start: "Start-Process",
  saps: "Start-Process",
  sajb: "Start-Job",
  ipmo: "Import-Module",
  echo: "Write-Output",
  write: "Write-Output",
  sleep: "Start-Sleep",
  help: "Get-Help",
  man: "Get-Help",
  gcm: "Get-Command",
  gsv: "Get-Service",
  gv: "Get-Variable",
  sv: "Set-Variable",
  h: "Get-History",
  history: "Get-History",
  iex: "Invoke-Expression",
  iwr: "Invoke-WebRequest",
  irm: "Invoke-RestMethod",
  icm: "Invoke-Command",
  ii: "Invoke-Item",
  iwmi: "Invoke-WmiMethod",
  icim: "Invoke-CimMethod",
  nsn: "New-PSSession",
  etsn: "Enter-PSSession",
  exsn: "Exit-PSSession",
  gsn: "Get-PSSession",
  rsn: "Remove-PSSession",
  cls: "Clear-Host",
  clear: "Clear-Host",
  select: "Select-Object",
  where: "Where-Object",
  foreach: "ForEach-Object",
  "%": "ForEach-Object",
  "?": "Where-Object",
  measure: "Measure-Object",
  ft: "Format-Table",
  fl: "Format-List",
  fw: "Format-Wide",
  oh: "Out-Host",
  ogv: "Out-GridView",
  ac: "Add-Content",
  clc: "Clear-Content",
  tee: "Tee-Object",
  epcsv: "Export-Csv",
  sp: "Set-ItemProperty",
  rp: "Remove-ItemProperty",
  cli: "Clear-Item",
  epal: "Export-Alias",
  sls: "Select-String",
});
//@ chunk-e6aww6q8.js:856049-856242 fingerprint = getAllCommandNames (1)
/**
 * 收集解析结果中所有语句的顶层命令与嵌套命令名（小写）。
 */
function getAllCommandNames(parsed) {
  let names = [];
  for (let statement of parsed.statements) {
    for (let cmd of statement.commands) names.push(cmd.name.toLowerCase());
    if (statement.nestedCommands)
      for (let cmd of statement.nestedCommands) names.push(cmd.name.toLowerCase());
  }
  return names;
}
//@ chunk-e6aww6q8.js:856242-856396 layout = getAllCommandNames (1)
/**
 * 收集解析结果中所有语句的顶层命令与嵌套命令对象（返回命令对象，不是名字）。
 */
function getAllCommands(parsed) {
  let names = [];
  for (let statement of parsed.statements) {
    for (let cmd of statement.commands) names.push(cmd);
    if (statement.nestedCommands) for (let cmd of statement.nestedCommands) names.push(cmd);
  }
  return names;
}
//@ chunk-e6aww6q8.js:856396-856603 fingerprint = getAllRedirections (1)
function getAllRedirections(parsed) {
  let redirections = [];
  for (let statement of parsed.statements) {
    for (let redir of statement.redirections) redirections.push(redir);
    if (statement.nestedCommands) {
      for (let cmd of statement.nestedCommands)
        if (cmd.redirections) for (let redir of cmd.redirections) redirections.push(redir);
    }
  }
  return redirections;
}
//@ chunk-e6aww6q8.js:856603-856714 fingerprint = getVariablesByScope (1)
/**
 * 按作用域前缀（如 env:、global:）过滤解析出的变量引用。
 */
function getVariablesByScope(parsed, scope) {
  let prefix = scope.toLowerCase() + ":";
  return parsed.variables.filter((v) => v.path.toLowerCase().startsWith(prefix));
}
//@ chunk-e6aww6q8.js:856714-856917 callgraph-witnessed = hasCommandNamed (0)
/**
 * 判断命令中是否出现指定命令：名字或别名任一方向经 COMMON_ALIASES 规范化后相等即算命中。
 */
function hasCommandNamed(parsed, name) {
  let lowerName = name.toLowerCase();
  let canonicalFromAlias = COMMON_ALIASES[lowerName]?.toLowerCase();
  for (let cmdName of getAllCommandNames(parsed)) {
    if (cmdName === lowerName) return true;
    let canonical = COMMON_ALIASES[cmdName]?.toLowerCase();
    if (canonical === lowerName) return true;
    if (canonicalFromAlias && cmdName === canonicalFromAlias) return true;
    if (canonical && canonicalFromAlias && canonical === canonicalFromAlias) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:856917-856966 layout
var PS_TOKENIZER_DASH_CHARS = new Set(["-", "\u2013", "\u2014", "\u2015"]);
//@ chunk-e6aww6q8.js:856966-857053 fingerprint = isPowerShellParameter (1)
/**
 * 判断参数是否是 PowerShell 形参：有 AST 元素类型时看是否为 Parameter，否则看首字符是否属于 PowerShell 认的破折号集合（含 Unicode 破折号）。
 */
function isPowerShellParameter(arg, elementType) {
  if (elementType !== undefined) return elementType === "Parameter";
  return arg.length > 0 && PS_TOKENIZER_DASH_CHARS.has(arg[0]);
}
//@ chunk-e6aww6q8.js:857053-857306 file-local
/**
 * 判断命令是否带某参数的缩写（PowerShell 允许唯一前缀缩写）：去掉反引号续行与冒号值后，参数须以最短前缀开头且是完整参数名的前缀。
 */
function commandHasArgAbbreviation(command, fullParam, minPrefix) {
  let lowerFull = fullParam.toLowerCase();
  let lowerMin = minPrefix.toLowerCase();
  return command.args.some((arg) => {
    let colonIndex = arg.indexOf(":", 1);
    let lower = (colonIndex > 0 ? arg.slice(0, colonIndex) : arg)
      .replace(/`[\r\n]+\s*/g, "")
      .replaceAll("`", "")
      .toLowerCase();
    return lower.startsWith(lowerMin) && lowerFull.startsWith(lower) && lower.length <= lowerFull.length;
  });
}
//@ chunk-e6aww6q8.js:857306-857342 fingerprint = getPipelineSegments (1)
function getPipelineSegments(parsed) {
  return parsed.statements;
}
//@ chunk-e6aww6q8.js:857342-857421 fingerprint = isNullRedirectionTarget (1)
/**
 * 重定向目标是否为 $null / ${null}（丢弃输出，不算写文件）。
 */
function isNullRedirectionTarget(target) {
  let t = target.trim().toLowerCase();
  return t === "$null" || t === "${null}";
}
//@ chunk-e6aww6q8.js:857421-857493 fingerprint = getFileRedirections (1)
/**
 * 取真正写文件的重定向：排除流合并（2>&1）和指向 $null 的重定向。
 */
function getFileRedirections(parsed) {
  return getAllRedirections(parsed).filter((n) => !n.isMerging && !isNullRedirectionTarget(n.target));
}
//@ chunk-e6aww6q8.js:857493-858490 fingerprint = deriveSecurityFlags (1)
/**
 * 汇总解析结果的安全标志：子表达式、脚本块、splat、可展开字符串、成员调用、赋值、--% 停止解析。
 */
function deriveSecurityFlags(parsed) {
  let flags = {
    hasSubExpressions: false,
    hasScriptBlocks: false,
    hasSplatting: false,
    hasExpandableStrings: false,
    hasMemberInvocations: false,
    hasAssignments: false,
    hasStopParsing: parsed.hasStopParsing,
  };
  function checkElements(cmd) {
    if (!cmd.elementTypes) return;
    for (let et of cmd.elementTypes)
      switch (et) {
        case "ScriptBlock":
          flags.hasScriptBlocks = true;
          break;
        case "SubExpression":
          flags.hasSubExpressions = true;
          break;
        case "ExpandableString":
          flags.hasExpandableStrings = true;
          break;
        case "MemberInvocation":
          flags.hasMemberInvocations = true;
          break;
      }
  }
  for (let stmt of parsed.statements) {
    if (stmt.statementType === "AssignmentStatementAst") flags.hasAssignments = true;
    for (let cmd of stmt.commands) checkElements(cmd);
    if (stmt.nestedCommands) for (let cmd of stmt.nestedCommands) checkElements(cmd);
    if (stmt.securityPatterns) {
      if (stmt.securityPatterns.hasMemberInvocations) flags.hasMemberInvocations = true;
      if (stmt.securityPatterns.hasSubExpressions) flags.hasSubExpressions = true;
      if (stmt.securityPatterns.hasExpandableStrings) flags.hasExpandableStrings = true;
      if (stmt.securityPatterns.hasScriptBlocks) flags.hasScriptBlocks = true;
    }
  }
  for (let v of parsed.variables)
    if (v.isSplatted) {
      flags.hasSplatting = true;
      break;
    }
  return flags;
}
//@ chunk-e6aww6q8.js:1195521-1195635 fingerprint = DIRECTORY_CHANGE_ALIASES (1)
/**
 * argv[0] 去掉路径后若是 cd/chdir/pushd/popd 则返回该名字，否则 undefined。是函数，不是旧版名所说的别名集合。
 */
function getDirectoryChangeBuiltin(argv) {
  let replaced = argv[0]?.replace(/^.*[\\/]/, "");
  return replaced === "cd" || replaced === "chdir" || replaced === "pushd" || replaced === "popd"
    ? replaced
    : undefined;
}
export {
  parsePowerShellCommand,
  getAllCommands,
  getAllCommandNames,
  stripModulePrefix,
  classifyCommandName,
  PS_TOKENIZER_DASH_CHARS,
  getFileRedirections,
  deriveSecurityFlags,
  toUtf16LeBase64,
  getDirectoryChangeBuiltin,
  COMMON_ALIASES,
  getPipelineSegments,
  isNullRedirectionTarget,
  isPowerShellParameter,
  normalizeUnicodeDashes,
  commandHasArgAbbreviation,
  hasCommandNamed,
  getVariablesByScope,
};
