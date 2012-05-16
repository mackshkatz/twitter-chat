require 'spec_helper'

describe PagesController do
	before do
		get 'index'
	end

	context "GET 'Index page'" do
		it "should be successful" do
			response.should be_success
		end
	end

	context "url" do
		it "should be the root" do
			current_path.should == "/"
		end
	end
end