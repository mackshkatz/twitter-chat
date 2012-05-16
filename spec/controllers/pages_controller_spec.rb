require 'spec_helper'

describe PagesController do
	describe "Index page" do
		before do
			get 'index'
		end

		it "should be successful" do
			response.should be_success
		end
	end
end