import { companyLogos } from "../constants";

const CompanyLogos = ({ className }) => {
  return (
    <div className={className}>
      <h5 className="tagline mb-6 text-center text-n-1/50">
        Built on open standards
      </h5>
      <ul className="flex flex-wrap justify-center gap-4">
        {companyLogos.map((label, index) => (
          <li
            className="flex items-center justify-center px-6 py-3 bg-n-9/50 border border-n-6 rounded-full"
            key={index}
          >
            <span className="font-code text-xs font-bold uppercase tracking-wider text-n-1/70">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompanyLogos;
