import { useCmsProductReader } from '../../../utils/cms-product-reader';

export default defineEventHandler((event) => useCmsProductReader(useRuntimeConfig(event)).listSeries());
