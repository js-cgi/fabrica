const VIEWS_PATH = "./views/";

const ctx = {
    stacks: {},
    onceBlocks: new Set(),
    verbatimBlocks: [],
    verbatimCounter: 0
};

function stripVerbatim(template) {
    return template.replace(/@verbatim\s*\n?([\s\S]*?)@endverbatim/g, (_, content) => {
        const id = ctx.verbatimCounter++;
        ctx.verbatimBlocks[id] = content;
        return `__VERBATIM_${id}__`;
    });
}

function restoreVerbatim(output) {
    return output.replace(/__VERBATIM_(\d+)__/g, (_, id) => {
        return ctx.verbatimBlocks[parseInt(id)] || "";
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function resolve(key, data) {
    return key.split(".").reduce((obj, part) => {
        if (obj === null || obj === undefined) return undefined;
        return obj[part];
    }, data);
}

function evaluate(expr, data) {
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);
    try {
        const fn = new Function(...keys, `return (${expr});`);
        return fn(...values);
    } catch(e) {
        return undefined;
    }
}

function interpolate(template, data) {
    let output = template;

    output = output.replace(/\{!!\s*(.+?)\s*!!\}/g, (_, expr) => {
        const value = resolve(expr.trim(), data);
        if (value !== undefined) return String(value);
        const evaluated = evaluate(expr.trim(), data);
        return evaluated !== undefined ? String(evaluated) : "";
    });

    output = output.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
        const value = resolve(expr.trim(), data);
        if (value !== undefined) return escapeHtml(value);
        const evaluated = evaluate(expr.trim(), data);
        return evaluated !== undefined ? escapeHtml(evaluated) : "";
    });

    return output;
}

function processInlineDirectives(line, data) {
    let result = line;

    result = result.replace(/@json\s*\(\s*([^)]+)\s*\)/g, (_, expr) => {
        const value = resolve(expr.trim(), data);
        if (value !== undefined) return JSON.stringify(value);
        const evaluated = evaluate(expr.trim(), data);
        return evaluated !== undefined ? JSON.stringify(evaluated) : "";
    });

    result = result.replace(/@class\s*\(\s*(\{[^}]+\})\s*\)/g, (_, expr) => {
        const obj = evaluate(expr, data);
        if (!obj) return "";
        const classes = Object.keys(obj).filter(k => obj[k]);
        return classes.join(" ");
    });

    result = result.replace(/@checked\s*\(\s*(.+?)\s*\)/g, (_, expr) => {
        return evaluate(expr, data) ? "checked" : "";
    });

    result = result.replace(/@selected\s*\(\s*(.+?)\s*\)/g, (_, expr) => {
        return evaluate(expr, data) ? "selected" : "";
    });

    result = result.replace(/@disabled\s*\(\s*(.+?)\s*\)/g, (_, expr) => {
        return evaluate(expr, data) ? "disabled" : "";
    });

    result = result.replace(/@required\s*\(\s*(.+?)\s*\)/g, (_, expr) => {
        return evaluate(expr, data) ? "required" : "";
    });

    let changed = true;
    let safety = 0;
    while (changed && safety < 20) {
        changed = false;
        safety++;
        result = result.replace(/@if\s*\((.+?)\)(.*?)@endif/g, (_, expr, content) => {
            changed = true;
            const parts = content.split("@else");
            if (evaluate(expr, data)) {
                return parts[0];
            } else {
                return parts[1] || "";
            }
        });
    }
    return result;
}

function processInclude(name, extraData, parentData) {
    const mergedData = { ...parentData, ...extraData };
    const filePath = VIEWS_PATH + name.replace(/\./g, "/") + ".html";
    const template = file.read(filePath);
    if (template === null || template === undefined) {
        throw new Error(`Include not found: ${name} (${filePath})`);
    }
    return compile(template, mergedData);
}

function processDirectives(template, data) {
    const lines = template.split("\n");
    const output = [];
    const stack = [];

    function isActive() {
        return stack.every(frame => frame.active);
    }

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Components
        if (trimmed.match(/^@component\s*\(\s*'([^']+)'\s*(?:,\s*(\{.*\}))?\s*\)\s*$/)) {
            const compMatch = trimmed.match(/^@component\s*\(\s*'([^']+)'\s*(?:,\s*(\{.*\}))?\s*\)\s*$/);
            const compName = compMatch[1];
            const propsExpr = compMatch[2];

            const blockLines = [];
            let depth = 1;
            i++;
            while (i < lines.length && depth > 0) {
                const l = lines[i].trim();
                if (l.match(/^@component\s*\(/)) depth++;
                if (l === "@endcomponent") {
                    depth--;
                    if (depth === 0) break;
                }
                blockLines.push(lines[i]);
                i++;
            }

            if (isActive()) {
                const props = propsExpr ? evaluate(propsExpr, data) || {} : {};
                const blockContent = blockLines.join("\n");

                const slots = {};
                const slotRegex = /@slot\s*\(\s*'([^']+)'\s*\)([\s\S]*?)@endslot/g;
                let slotMatch;
                let defaultContent = blockContent;
                while ((slotMatch = slotRegex.exec(blockContent)) !== null) {
                    slots[slotMatch[1]] = compile(slotMatch[2].trim(), data);
                    defaultContent = defaultContent.replace(slotMatch[0], "");
                }

                const defaultSlot = compile(defaultContent.trim(), data);

                const compPath = VIEWS_PATH + compName.replace(/\./g, "/") + ".html";
                const compTemplate = file.read(compPath);
                if (compTemplate === null || compTemplate === undefined) {
                    throw new Error(`Component not found: ${compName} (${compPath})`);
                }

                const compData = { ...data, $props: props, $slot: defaultSlot, $slots: slots };
                const compResult = compile(compTemplate, compData);
                output.push(compResult);
            }

            i++;
            continue;
        }

        if (trimmed === "@endcomponent") {
            i++;
            continue;
        }

        // Push to stack
        if (trimmed.match(/^@push\s*\(\s*'([^']+)'\s*\)\s*$/)) {
            const stackName = trimmed.match(/^@push\s*\(\s*'([^']+)'\s*\)\s*$/)[1];

            const blockLines = [];
            i++;
            while (i < lines.length) {
                if (lines[i].trim() === "@endpush") break;
                blockLines.push(lines[i]);
                i++;
            }

            if (isActive()) {
                const content = compile(blockLines.join("\n"), data);
                if (!ctx.stacks[stackName]) ctx.stacks[stackName] = [];
                ctx.stacks[stackName].push(content);
            }

            i++;
            continue;
        }

        if (trimmed === "@endpush") {
            i++;
            continue;
        }

        // Stack output
        if (trimmed.match(/^@stack\s*\(\s*'([^']+)'\s*\)\s*$/)) {
            if (isActive()) {
                const stackName = trimmed.match(/^@stack\s*\(\s*'([^']+)'\s*\)\s*$/)[1];
                output.push("__STACK__:" + stackName);
            }
            i++;
            continue;
        }

        // Once
        if (trimmed === "@once") {
            const blockLines = [];
            i++;
            while (i < lines.length) {
                if (lines[i].trim() === "@endonce") break;
                blockLines.push(lines[i]);
                i++;
            }

            if (isActive()) {
                const blockKey = blockLines.join("\n");
                if (!ctx.onceBlocks.has(blockKey)) {
                    ctx.onceBlocks.add(blockKey);
                    const content = compile(blockLines.join("\n"), data);
                    output.push(content);
                }
            }

            i++;
            continue;
        }

        if (trimmed === "@endonce") {
            i++;
            continue;
        }

        // If/Elseif/Else/Endif
        if (trimmed.match(/^@if\s*\((.+)\)\s*$/)) {
            const expr = trimmed.match(/^@if\s*\((.+)\)\s*$/)[1];
            const result = isActive() ? !!evaluate(expr, data) : false;
            stack.push({ type: "if", active: result, resolved: result });
            i++;
            continue;
        }

        if (trimmed.match(/^@elseif\s*\((.+)\)\s*$/)) {
            const expr = trimmed.match(/^@elseif\s*\((.+)\)\s*$/)[1];
            const frame = stack[stack.length - 1];
            if (frame && frame.type === "if") {
                if (frame.resolved) {
                    frame.active = false;
                } else {
                    const parentActive = stack.slice(0, -1).every(f => f.active);
                    const result = parentActive ? !!evaluate(expr, data) : false;
                    frame.active = result;
                    if (result) frame.resolved = true;
                }
            }
            i++;
            continue;
        }

        if (trimmed === "@else") {
            const frame = stack[stack.length - 1];
            if (frame && frame.type === "if") {
                frame.active = !frame.resolved;
            }
            i++;
            continue;
        }

        if (trimmed === "@endif") {
            stack.pop();
            i++;
            continue;
        }

        // Unless
        if (trimmed.match(/^@unless\s*\((.+)\)\s*$/)) {
            const expr = trimmed.match(/^@unless\s*\((.+)\)\s*$/)[1];
            const result = isActive() ? !evaluate(expr, data) : false;
            stack.push({ type: "if", active: result, resolved: result });
            i++;
            continue;
        }

        if (trimmed === "@endunless") {
            stack.pop();
            i++;
            continue;
        }

        // Foreach
        if (trimmed.match(/^@foreach\s*\((.+)\s+as\s+(.+)\)\s*$/)) {
            const match = trimmed.match(/^@foreach\s*\((.+)\s+as\s+(.+)\)\s*$/);
            const arrExpr = match[1].trim();
            const varNames = match[2].trim();

            const blockLines = [];
            let depth = 1;
            i++;
            while (i < lines.length && depth > 0) {
                const l = lines[i].trim();
                if (l.match(/^@foreach\s*\(/)) depth++;
                if (l === "@endforeach") {
                    depth--;
                    if (depth === 0) break;
                }
                blockLines.push(lines[i]);
                i++;
            }

            if (isActive()) {
                const arr = evaluate(arrExpr, data);
                if (arr && Array.isArray(arr)) {
                    let keyVar = null;
                    let valVar = varNames;
                    if (varNames.includes(",")) {
                        const parts = varNames.split(",").map(s => s.trim());
                        keyVar = parts[0];
                        valVar = parts[1];
                    }

                    for (let idx = 0; idx < arr.length; idx++) {
                        const loopData = { ...data };
                        if (keyVar) {
                            loopData[keyVar] = idx;
                            loopData[valVar] = arr[idx];
                        } else {
                            loopData[valVar] = arr[idx];
                        }
                        loopData.loop = {
                            index: idx,
                            iteration: idx + 1,
                            first: idx === 0,
                            last: idx === arr.length - 1,
                            count: arr.length
                        };
                        const blockResult = compile(blockLines.join("\n"), loopData);
                        output.push(blockResult);
                    }
                }
            }

            i++;
            continue;
        }

        if (trimmed === "@endforeach") {
            i++;
            continue;
        }

        // For
        if (trimmed.match(/^@for\s*\((.+)\)\s*$/)) {
            const expr = trimmed.match(/^@for\s*\((.+)\)\s*$/)[1];

            const blockLines = [];
            let depth = 1;
            i++;
            while (i < lines.length && depth > 0) {
                const l = lines[i].trim();
                if (l.match(/^@for\s*\(/)) depth++;
                if (l === "@endfor") {
                    depth--;
                    if (depth === 0) break;
                }
                blockLines.push(lines[i]);
                i++;
            }

            if (isActive()) {
                const parts = expr.split(";").map(s => s.trim());
                if (parts.length === 3) {
                    const initMatch = parts[0].match(/(?:let|var|const)?\s*(\w+)\s*=\s*(.+)/);
                    if (initMatch) {
                        const varName = initMatch[1];
                        let current = evaluate(initMatch[2], data);
                        const condExpr = parts[1];
                        const updateExpr = parts[2];

                        let iterations = 0;
                        const maxIterations = 10000;

                        while (iterations < maxIterations) {
                            const loopData = { ...data, [varName]: current };
                            if (!evaluate(condExpr, loopData)) break;

                            const blockResult = compile(blockLines.join("\n"), loopData);
                            output.push(blockResult);

                            const updated = evaluate(`(() => { let ${varName} = ${current}; ${updateExpr}; return ${varName}; })()`, data);
                            current = updated;
                            iterations++;
                        }
                    }
                }
            }

            i++;
            continue;
        }

        if (trimmed === "@endfor") {
            i++;
            continue;
        }

        // Default: output line with inline processing
        if (isActive()) {
            let processed = line;

            processed = processed.replace(/@include\s*\(\s*'([^']+)'\s*(?:,\s*(\{[^}]*\}))?\s*\)/g, (_, name, extraExpr) => {
                const extra = extraExpr ? evaluate(extraExpr, data) || {} : {};
                return processInclude(name, extra, data);
            });

            processed = processInlineDirectives(processed, data);
            processed = interpolate(processed, data);
            output.push(processed);
        }

        i++;
    }

    return output.join("\n");
}

function extractSections(template) {
    const sections = {};
    const regex = /@section\s*\(\s*'([^']+)'\s*\)([\s\S]*?)@endsection/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
        sections[match[1]] = match[2].trim();
    }
    return sections;
}

function processExtends(template, data, childSections) {
    const extendsMatch = template.match(/^@extends\s*\(\s*'([^']+)'\s*\)\s*$/m);
    if (!extendsMatch) {
        if (childSections) {
            return template.replace(/@yield\s*\(\s*'([^']+)'\s*(?:,\s*'([^']*)')?\s*\)/g, (_, name, defaultVal) => {
                return childSections[name] !== undefined ? childSections[name] : (defaultVal || "");
            });
        }
        return template;
    }

    const layoutName = extendsMatch[1];
    const mySections = extractSections(template);
    const allSections = { ...mySections, ...(childSections || {}) };

    const layoutPath = VIEWS_PATH + layoutName.replace(/\./g, "/") + ".html";
    const layoutTemplate = file.read(layoutPath);
    if (layoutTemplate === null || layoutTemplate === undefined) {
        throw new Error(`Layout not found: ${layoutName} (${layoutPath})`);
    }

    let result = layoutTemplate;
    result = result.replace(/@yield\s*\(\s*'([^']+)'\s*(?:,\s*'([^']*)')?\s*\)/g, (_, name, defaultVal) => {
        return allSections[name] !== undefined ? allSections[name] : (defaultVal || "");
    });

    return processExtends(result, data, allSections);
}

function resolveStacks(output) {
    return output.replace(/__STACK__:(\w+)/g, (_, name) => {
        return (ctx.stacks[name] || []).join("\n");
    });
}

function compile(template, data) {
    const stripped = stripVerbatim(template);
    const resolved = processExtends(stripped, data);
    return processDirectives(resolved, data);
}

export const View = {
    render(name, data) {
        ctx.stacks = {};
        ctx.onceBlocks = new Set();

        const filePath = VIEWS_PATH + name.replace(/\./g, "/") + ".html";
        const template = file.read(filePath);
        if (template === null || template === undefined) {
            throw new Error(`View not found: ${name} (${filePath})`);
        }
        ctx.verbatimBlocks = [];
        ctx.verbatimCounter = 0;

        let result = compile(template, data || {});
        result = resolveStacks(result);
        result = restoreVerbatim(result);
        return result;
    },

    compile(template, data) {
        return compile(template, data || {});
    }
};
