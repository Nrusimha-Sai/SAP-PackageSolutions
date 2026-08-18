import { DatasphereAgentView } from '../../features/datasphere-agent';

/**
 * View wrapper — keeps the existing PackageSolution routing/view system intact.
 * The full Datasphere Agent functionality lives in the feature module.
 */
const JrDatasphereAgent = ({ sharedFile, setSharedFile }) => (
  <DatasphereAgentView sharedFile={sharedFile} setSharedFile={setSharedFile} />
);

export default JrDatasphereAgent;
