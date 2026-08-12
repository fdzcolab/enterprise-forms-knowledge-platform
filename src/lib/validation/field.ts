import { z } from "zod";
import type { FormFieldDefinition } from "@/generated/prisma/client";

export function validateFieldValue(field: Pick<FormFieldDefinition, "fieldType"|"required"|"maxLength"|"minValue"|"maxValue"|"options">, value: unknown) {
  try {
    if ((value === null || value === undefined || value === "") && field.required) throw new Error("FIELD_VALIDATION_ERROR");
    if (value === null || value === undefined || value === "") return value;
    switch (field.fieldType) {
      case "SHORT_TEXT": case "LONG_TEXT": case "PHONE": {
        const text = z.string().parse(value);
        if (field.maxLength && text.length > field.maxLength) throw new Error("FIELD_VALIDATION_ERROR");
        return text;
      }
      case "EMAIL": {
        const text=z.string().email().parse(value); if(field.maxLength&&text.length>field.maxLength)throw new Error("FIELD_VALIDATION_ERROR"); return text;
      }
      case "URL": {
        const text=z.string().url().parse(value); if(field.maxLength&&text.length>field.maxLength)throw new Error("FIELD_VALIDATION_ERROR"); return text;
      }
      case "DATE": return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(value);
      case "DATETIME": return z.string().datetime({ offset: true }).parse(value);
      case "NUMBER": case "INTEGER": {
        const n = z.number().finite().parse(typeof value === "string" && value.trim() !== "" ? Number(value) : value);
        if (field.fieldType === "INTEGER" && !Number.isInteger(n)) throw new Error("FIELD_VALIDATION_ERROR");
        if (field.minValue != null && n < field.minValue) throw new Error("FIELD_VALIDATION_ERROR");
        if (field.maxValue != null && n > field.maxValue) throw new Error("FIELD_VALIDATION_ERROR");
        return n;
      }
      case "BOOLEAN": return z.boolean().parse(value);
      case "SINGLE_SELECT": {
        const v = z.string().parse(value); const options = Array.isArray(field.options) ? field.options.map(String) : [];
        if (options.length && !options.includes(v)) throw new Error("FIELD_VALIDATION_ERROR"); return v;
      }
      case "MULTI_SELECT": case "TAGS": {
        const arr = z.array(z.string()).parse(value); const options = Array.isArray(field.options) ? field.options.map(String) : [];
        if (field.fieldType === "MULTI_SELECT" && options.length && arr.some((v) => !options.includes(v))) throw new Error("FIELD_VALIDATION_ERROR");
        return arr;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === "FIELD_VALIDATION_ERROR") throw error;
    throw new Error("FIELD_VALIDATION_ERROR");
  }
}
