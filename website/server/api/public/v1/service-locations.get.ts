import { useCmsServiceContentReader } from '../../../utils/cms-service-content-reader';

export default defineEventHandler((event) => useCmsServiceContentReader(useRuntimeConfig(event)).listLocations());
