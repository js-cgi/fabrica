export const Validator = {
    validate(data, rules) {
        const errors = {};

        for (const field of Object.keys(rules)) {
            const ruleList = rules[field].split("|");
            const value = data[field];

            for (const rule of ruleList) {
                const [ruleName, ruleParam] = rule.split(":");
                const error = checkRule(ruleName, ruleParam, field, value, data);
                if (error) {
                    if (!errors[field]) errors[field] = [];
                    errors[field].push(error);
                }
            }
        }

        return {
            passes: Object.keys(errors).length === 0,
            fails: Object.keys(errors).length > 0,
            errors
        };
    }
};

function checkRule(rule, param, field, value, data) {
    const label = field.replace(/_/g, " ");

    switch (rule) {
        case "required":
            if (value === undefined || value === null || value === "") {
                return label + " is required";
            }
            break;

        case "email":
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return label + " must be a valid email";
            }
            break;

        case "min":
            if (value && value.length < parseInt(param)) {
                return label + " must be at least " + param + " characters";
            }
            break;

        case "max":
            if (value && value.length > parseInt(param)) {
                return label + " must not exceed " + param + " characters";
            }
            break;

        case "confirmed":
            if (value !== data[field + "_confirmation"]) {
                return label + " confirmation does not match";
            }
            break;

        case "numeric":
            if (value && isNaN(value)) {
                return label + " must be a number";
            }
            break;

        case "in":
            if (value && !param.split(",").includes(value)) {
                return label + " must be one of: " + param;
            }
            break;
    }

    return null;
}
