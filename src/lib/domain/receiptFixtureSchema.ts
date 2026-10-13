/**
 * Skema Valibot untuk Berkas Fixture Ekstraksi Struk
 * Memvalidasi teks hasil OCR per baris, bounding box spasial, ukuran gambar,
 * dan ekspektasi hasil finansial ("ground truth") yang diverifikasi pengguna.
 */
import * as v from 'valibot';

export const ReceiptBoundingBoxSchema = v.object({
	left: v.number(),
	top: v.number(),
	right: v.number(),
	bottom: v.number()
});

export const ReceiptOcrLineSchema = v.object({
	text: v.string(),
	boundingBox: v.optional(ReceiptBoundingBoxSchema)
});

export const ReceiptImageSchema = v.object({
	width: v.number(),
	height: v.number()
});

export const ReceiptExpectedItemSchema = v.object({
	name: v.string(),
	qty: v.optional(v.pipe(v.number(), v.minValue(0))),
	unitPrice: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	totalPrice: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
});

export const ReceiptExpectedSchema = v.object({
	merchantName: v.optional(v.string()),
	date: v.optional(v.string()),
	time: v.optional(v.string()),
	grandTotal: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	subtotal: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	discountAmount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	taxAmount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	serviceCharge: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	items: v.optional(v.array(ReceiptExpectedItemSchema)),
	suggestedCategoryKeyword: v.optional(v.string())
});

export const ReceiptFixtureSchema = v.object({
	description: v.optional(v.string()),
	image: ReceiptImageSchema,
	ocr: v.object({
		rawText: v.string(),
		lines: v.array(ReceiptOcrLineSchema)
	}),
	expected: v.optional(ReceiptExpectedSchema)
});

export type ReceiptFixture = v.InferOutput<typeof ReceiptFixtureSchema>;
