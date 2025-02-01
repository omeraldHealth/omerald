import React from 'react';
import Image from 'next/image';
import { ParagraphText } from '@/components/atoms/typograph';
import { UserLayout } from '@/components/templates/layouts/UserLayout';

const Consent = () => {
  return (
    <UserLayout 
      tabName="Omerald | User Consent" 
      tabDescription="Omerald is a health management platform to connect people and doctors with ease."
    >
      <div className="w-full">
        <div className="w-full">
          <div className="py-12 text-center">
            <div className="w-full lg:w-full px-3 mb-12 lg:mb-0 pb-10">
              <div className="flex items-center justify-center">
                <Image
                  className="w-[60vw] md:w-[40vw] lg:w-[20vw]"
                  src="/pictures/consent.svg"
                  alt="Consent Illustration"
                  width={300}
                  height={300}
                />
              </div>
            </div>
            <div className="max-w-full lg:max-w-full mx-auto lg:mx-0 mb-8 text-center">
              <h2 className="text-3xl lg:text-5xl mb-4 font-bold">
                <span className="text-orange-400">Platform Consent</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-orange-50 py-20">
        <div className="w-full mr-auto ml-auto pl-4 pr-4 max-w-7xl">
          <div className="flex flex-wrap items-center -mx-3">
            <div className="w-full px-3">
              <div className="pb-12">
                <div className="max-w-7xl mx-auto lg:mx-0 mb-8 text-center lg:text-left">
                  <ParagraphText>Last updated on March 30 2024</ParagraphText>
                  <ParagraphText style="text-gray-600 italic font-light">
                    <br/>
                    PRIVACY POLICY
                    <br/>We care about data privacy and security. Please review our Privacy Policy [CLICK HERE]/posted on the Site]. By using the Site, you agree to be bound by our Privacy Policy, which is incorporated into these Terms of Use. Please be advised the Site is hosted in the India. 
                    <br/><br/> If you access the Site from the European Union, Asia, or any other region of the world with laws or other requirements governing personal data collection, use, or disclosure that differ from applicable laws in the India, then through your continued use of the Site, you are transferring your data to the India, and you expressly consent to have your data transferred to and processed in the India. 
                    <br/><br/>Further, we do not knowingly accept, request, or solicit information from children or knowingly market to children. Therefore, in accordance with the U.S. Children&apos;s Online Privacy Protection Act, if we receive actual knowledge that anyone under the age of 13 has provided personal information to us without the requisite and verifiable parental consent, we will delete that information from the Site as quickly as is reasonably practical.]
                  </ParagraphText>
                  <ParagraphText style="text-gray-600 italic font-light">
                    <br/>
                    DIGITAL MILLENNIUM COPYRIGHT ACT (DMCA) NOTICE AND POLICY<br/><br/>
                    Notifications
                    We respect the intellectual property rights of others. If you believe that any material available on or through the Site infringes upon any copyright you own or control, please immediately notify our Designated Copyright Agent using the contact information provided below (a &quot;Notification&quot;). 
                    <br/><br/>A copy of your Notification will be sent to the person who posted or stored the material addressed in the Notification. Please be advised that pursuant to federal law you may be held liable for damages if you make material misrepresentations in a Notification. Thus, if you are not sure that material located on or linked to by the Site infringes your copyright, you should consider first contacting an attorney.
                    <br/><br/>All Notifications should meet the requirements of DMCA 17 U.S.C. § 512(c)(3) and include the following information: 
                    (1) A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed; 
                    (2) identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works on the Site are covered by the Notification, a representative list of such works on the Site; 
                    (3) identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material; 
                    (4) information reasonably sufficient to permit us to contact the complaining party, such as an address, telephone number, and, if available, an email address at which the complaining party may be contacted; 
                    (5) a statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law; 
                    (6) a statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed upon.
                  </ParagraphText>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export async function getStaticProps() {
  return {
    props: {},
  };
}

export default Consent;

