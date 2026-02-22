import { isValidObjectId } from "mongoose";

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function createValidationError(message, details = {}) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  error.status = 400;
  error.details = details;
  return error;
}

function createNotFoundError(message, details = {}) {
  const error = new Error(message);
  error.code = "NOTE_NOT_FOUND";
  error.status = 404;
  error.details = details;
  return error;
}

function formatDateLabel(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month}-${day}`;
}

function parsePagination(query = {}) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? DEFAULT_PAGE_SIZE);

  if (!Number.isInteger(page) || page < 1) {
    throw createValidationError("page must be an integer >= 1", { field: "page" });
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw createValidationError(
      `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      { field: "pageSize" }
    );
  }

  return { page, pageSize };
}

function serializeListItem(note) {
  return {
    id: String(note._id),
    title: note.title || "(untitled)",
    dateLabel: formatDateLabel(note.regdate),
    favorite: Boolean(note.favorite),
    tags: Array.isArray(note.category) ? note.category.filter(Boolean) : []
  };
}

function serializeDetailItem(note) {
  return {
    id: String(note._id),
    title: note.title || "(untitled)",
    note: String(note.note ?? ""),
    dateLabel: formatDateLabel(note.regdate),
    favorite: Boolean(note.favorite),
    tags: Array.isArray(note.category) ? note.category.filter(Boolean) : []
  };
}

export function isNoteId(input) {
  return /^[a-f\d]{24}$/i.test(String(input ?? "").trim());
}

export function createReviewService(options = {}) {
  const {
    JmemoModel,
    categoryFilterTags = []
  } = options;

  if (!JmemoModel) {
    throw new Error("JmemoModel is required for createReviewService");
  }

  const baseFilter =
    Array.isArray(categoryFilterTags) && categoryFilterTags.length > 0
      ? { category: { $in: categoryFilterTags } }
      : {};

  return {
    async listReviews(query = {}) {
      const { page, pageSize } = parsePagination(query);
      const skip = (page - 1) * pageSize;
      const sort = { favorite: -1, regdate: -1, _id: -1 };

      const [items, total] = await Promise.all([
        JmemoModel.find(baseFilter, {
          title: 1,
          regdate: 1,
          favorite: 1,
          category: 1
        })
          .sort(sort)
          .skip(skip)
          .limit(pageSize)
          .lean(),
        JmemoModel.countDocuments(baseFilter)
      ]);

      return {
        items: items.map(serializeListItem),
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total
      };
    },

    async getReviewById(id) {
      if (!isValidObjectId(id)) {
        const error = new Error("Invalid note id format");
        error.code = "INVALID_ID_FORMAT";
        error.status = 404;
        throw error;
      }

      const note = await JmemoModel.findOne(
        { _id: id, ...baseFilter },
        {
          title: 1,
          note: 1,
          regdate: 1,
          favorite: 1,
          category: 1
        }
      ).lean();

      if (!note) {
        throw createNotFoundError("Note not found", { id });
      }

      return serializeDetailItem(note);
    }
  };
}
