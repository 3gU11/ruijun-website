import { useCmsEvidenceReader } from '../../../utils/cms-evidence-reader';

export default defineEventHandler((event) => useCmsEvidenceReader(useRuntimeConfig(event)).listMilestones());
